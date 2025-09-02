<template>
    <div class="tag-input-container">
        <div ref="editableContainer" class="editable-area" contenteditable="true" @keydown="handleKeyDown"
            @focus="handleFocus" @click="handleClick" @input="handleInput" placeholder="请输入内容或点击下方标签添加..."></div>
        <div class="tags-container">
            <el-tag v-for="tag in modelValue.tags" :key="tag" class="tag-item" @click="handleTagClick(tag)">
                {{ tag }}
            </el-tag>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, h, render, useTemplateRef, onMounted, nextTick, toRaw } from 'vue'
import { ElTag } from 'element-plus'
import { CursorManager } from '../utils/CursorManager'

export interface TagInputModelValue {
    tags: string[]; // 可选标签列表
    value: Array<{ type: 'text' | 'tag'; value: string }>; // 输入框中的内容，可能是文本也可能是标签
}

interface TagInputProps {
    modelValue: TagInputModelValue;
}

const props = withDefaults(defineProps<TagInputProps>(), {
    modelValue: () => ({ tags: [], value: [] })
});

const emit = defineEmits<{
    'update:modelValue': [value: TagInputModelValue]
}>();

const editableContainer = useTemplateRef<HTMLElement>("editableContainer");
const currentRange = ref<Range | null>(null);

// 光标管理实例
let cursorManager: CursorManager;

// 初始化组件
const initComponent = () => {
    if (!editableContainer.value) return;

    // 初始化光标管理器
    cursorManager = new CursorManager(editableContainer.value);

    // 初始化时把 modelValue 转换为真实 dom
    renderModelValue();
};

// 将 modelValue 渲染到 DOM 中
const renderModelValue = () => {
    if (!editableContainer.value || !props.modelValue.value.length) return;

    editableContainer.value.innerHTML = '';

    props.modelValue.value.forEach(item => {
        if (item.type === 'text') {
            const textNode = document.createTextNode(item.value);
            editableContainer.value?.appendChild(textNode);
        } else if (item.type === 'tag') {
            const tagContainer = createTagContainer(item.value);
            editableContainer.value?.appendChild(tagContainer);
        }
    });
};

// 生成一个 ElTag 标签的虚拟节点
const createTagElement = (tag: string, onRemove: () => void) => {
    return h(ElTag, {
        key: tag,
        closable: true,
        onClose: (e: Event) => {
            e.stopPropagation();
            onRemove();
        }
    }, {
        default: () => tag
    });
};

// 创建标签容器 DOM 元素
const createTagContainer = (tag: string) => {
    const container = document.createElement('span');
    container.style.display = 'inline-block';
    container.contentEditable = 'false';
    container.dataset.tag = tag;
    container.className = 'tag-container';

    // 定义删除函数
    const removeTag = () => {
        if (cursorManager) {
            cursorManager.removeElementAndAdjustCursor(container);
        }
        nextTick(() => {
            updateModelValue();
            saveCursorPosition();
        });
    };

    // 创建虚拟节点并渲染到容器中
    const vnode = createTagElement(tag, removeTag);
    render(vnode, container);

    return container;
};

// 更新 modelValue
const updateModelValue = () => {
    if (!editableContainer.value) return;

    const value: Array<{ type: 'text' | 'tag'; value: string }> = [];

    // 遍历编辑器中的所有子节点
    Array.from(editableContainer.value.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (text) {
                value.push({ type: 'text', value: text });
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            if (element.classList.contains('tag-container')) {
                const tagValue = element.dataset.tag;
                if (tagValue) {
                    value.push({ type: 'tag', value: tagValue });
                }
            }
        }
    });

    emit('update:modelValue', {
        tags: toRaw(props.modelValue.tags),
        value
    });
};

// 保存当前光标位置
const saveCursorPosition = () => {
    if (cursorManager) {
        currentRange.value = cursorManager.saveCurrentRange();
    }
};

// 处理输入框焦点事件
const handleFocus = () => {
    saveCursorPosition();
};

// 处理输入框点击事件
const handleClick = () => {
    saveCursorPosition();
};

// 处理输入框输入事件
const handleInput = () => {
    nextTick(() => {
        updateModelValue();
        saveCursorPosition();
    });
};

// 点击标签添加到输入框中
const handleTagClick = (tag: string) => {
    if (!editableContainer.value || !cursorManager) return;

    // 创建标签容器
    const tagContainer = createTagContainer(tag);

    // 获取当前保存的光标位置，如果没有则使用默认位置
    let targetRange = currentRange.value;
    if (!targetRange || !editableContainer.value.contains(targetRange.commonAncestorContainer)) {
        targetRange = cursorManager.getDefaultRange();
    }

    // 在指定位置插入标签
    cursorManager.insertElementAtRange(tagContainer, targetRange);

    // 更新数据
    nextTick(() => {
        updateModelValue();
        saveCursorPosition();
    });
};

// 处理键盘删除事件
const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Backspace') {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);

        // 如果有选中内容，让浏览器自然处理删除
        if (!range.collapsed) {
            return;
        }

        const { startContainer, startOffset } = range;

        // 方法1: 检查光标是否在标签容器内
        let currentNode: Node | null = startContainer;
        while (currentNode && currentNode !== editableContainer.value) {
            if (currentNode.nodeType === Node.ELEMENT_NODE) {
                const element = currentNode as HTMLElement;
                if (element.classList?.contains('tag-container')) {
                    e.preventDefault();
                    if (cursorManager) {
                        cursorManager.removeElementAndAdjustCursor(element);
                    }
                    nextTick(() => {
                        updateModelValue();
                        saveCursorPosition();
                    });
                    return;
                }
            }
            currentNode = currentNode.parentNode;
        }

        // 方法2: 检查光标前面是否有标签（更精确的判断）
        if (startOffset === 0 && startContainer.nodeType === Node.TEXT_NODE) {
            // 文本节点开始位置，检查前一个兄弟节点
            const prevSibling = startContainer.previousSibling as HTMLElement;
            if (prevSibling?.classList?.contains('tag-container')) {
                e.preventDefault();
                if (cursorManager) {
                    cursorManager.removeElementAndAdjustCursor(prevSibling);
                }
                nextTick(() => {
                    updateModelValue();
                    saveCursorPosition();
                });
                return;
            }
        } else if (startContainer === editableContainer.value && startOffset > 0) {
            // 在容器根节点且不在开始位置，检查光标位置前的子节点
            const childNodes = Array.from(editableContainer.value.childNodes);
            const prevChild = childNodes[startOffset - 1] as HTMLElement;
            if (prevChild?.classList?.contains('tag-container')) {
                e.preventDefault();
                if (cursorManager) {
                    cursorManager.removeElementAndAdjustCursor(prevChild);
                }
                nextTick(() => {
                    updateModelValue();
                    saveCursorPosition();
                });
                return;
            }
        }

        // 方法3: 特殊情况 - 光标在容器末尾且最后一个元素是标签
        if (startContainer === editableContainer.value) {
            const children = editableContainer.value.children;
            const childNodes = editableContainer.value.childNodes;

            // 检查是否在末尾且最后一个是标签
            if (startOffset === childNodes.length && children.length > 0) {
                const lastChild = children[children.length - 1] as HTMLElement;
                if (lastChild?.classList?.contains('tag-container')) {
                    e.preventDefault();
                    if (cursorManager) {
                        cursorManager.removeElementAndAdjustCursor(lastChild);
                    }
                    nextTick(() => {
                        updateModelValue();
                        saveCursorPosition();
                    });
                    return;
                }
            }
        }
    }

    // 其他按键或无需特殊处理的 Backspace，保存光标位置
    nextTick(() => {
        saveCursorPosition();
    });
};

onMounted(() => {
    initComponent();
});
</script>

<style lang="scss" scoped>
.tag-input-container {
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    padding: 10px;

    .editable-area {
        min-height: 24px;
        border: 1px solid #e4e7ed;
        border-radius: 4px;
        padding: 8px;
        margin-bottom: 10px;
        outline: none;
        line-height: 1.5;
        position: relative;
        font-size: 14px;
        word-wrap: break-word;
        white-space: pre-wrap;

        &:focus {
            border-color: #409eff;
        }

        &:empty::before {
            content: attr(placeholder);
            color: #c0c4cc;
            position: absolute;
            pointer-events: none;
        }

        // 标签容器样式
        :deep(.tag-container) {
            display: inline-block;
            margin: 0 4px;
            vertical-align: baseline; // 与文字基线对齐
            line-height: 1.5; // 与文字行高一致

            .el-tag {
                display: inline-flex;
                align-items: center;
                cursor: default;
                user-select: none;
                margin: 0; // 移除 tag 自身的 margin
                vertical-align: baseline; // 与文字基线对齐
                font-size: 12px; // 稍小的字体使其更协调
                height: 22px; // 固定高度确保对齐
                line-height: 1;
                border-radius: 3px;

                .el-tag__close {
                    margin-left: 4px;
                    cursor: pointer;
                    transition: all 0.3s;
                    font-size: 12px;

                    &:hover {
                        background-color: #909399;
                        color: #fff;
                        border-radius: 50%;
                    }
                }
            }
        }
    }

    .tags-container {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;

        .tag-item {
            cursor: pointer;
            transition: all 0.3s;

            &:hover {
                opacity: 0.8;
                transform: translateY(-1px);
            }
        }
    }
}
</style>
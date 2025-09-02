<template>
    <div class="tag-input-container">
        <div ref="editableContainer" class="editable-area" contenteditable="true" @keydown="handleKeyDown"
            @focus="handleFocus" @click="handleClick" @input="handleInput" placeholder="请输入内容或点击下方标签添加..."></div>
        <div class="tags-container">
            <el-tag v-for="tag in tags" :key="tag" class="tag-item" @click="handleTagClick(tag)">
                {{ tag }}
            </el-tag>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, h, render, useTemplateRef, onMounted, nextTick } from 'vue'
import { ElTag } from 'element-plus'
import { CursorManager } from '../utils/CursorManager'

export interface TagInputModelValue {
    tags: string[]; // 可选标签列表
    value: Array<{ type: 'text' | 'tag'; value: string }>; // 输入框中的内容，可能是文本也可能是标签
}

interface TagInputProps {
    modelValue: TagInputModelValue;
    availableTags?: string[]; // 可选的标签列表
}

const props = withDefaults(defineProps<TagInputProps>(), {
    modelValue: () => ({ tags: [], value: [] }),
    availableTags: () => ['礼物', '弹幕', "节日"]
});

const emit = defineEmits<{
    'update:modelValue': [value: TagInputModelValue]
}>();

const tags = ref(props.availableTags);
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
        tags: tags.value,
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
        if (selection && selection.anchorNode) {
            // 检查光标是否在标签旁边或标签内
            const anchorNode = selection.anchorNode;
            const parentElement = anchorNode.nodeType === Node.TEXT_NODE ?
                anchorNode.parentElement : anchorNode as HTMLElement;

            // 如果光标在标签容器内
            const tagContainer = parentElement?.closest('.tag-container') as HTMLElement;
            if (tagContainer) {
                e.preventDefault();

                if (cursorManager) {
                    cursorManager.removeElementAndAdjustCursor(tagContainer);
                }

                // 更新数据
                nextTick(() => {
                    updateModelValue();
                    saveCursorPosition();
                });

                return;
            }

            // 检查光标前面是否是标签
            if (selection.anchorOffset === 0) {
                let prevElement: HTMLElement | null = null;

                // 如果当前节点是文本节点，检查前一个兄弟元素
                if (anchorNode.nodeType === Node.TEXT_NODE) {
                    prevElement = anchorNode.previousSibling as HTMLElement;
                } else {
                    // 如果当前是元素节点，检查前一个子元素
                    const currentElement = anchorNode as HTMLElement;
                    prevElement = currentElement.previousElementSibling as HTMLElement;
                }

                if (prevElement?.classList?.contains('tag-container')) {
                    e.preventDefault();

                    if (cursorManager) {
                        cursorManager.removeElementAndAdjustCursor(prevElement);
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

    // 保存光标位置
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
        min-height: 50px;
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
<template>
    <div class="tag-input-container">
        <div ref="editableContainer" class="editable-area" contenteditable="true" @keydown="handleKeyDown"
            @focus="handleFocus" @click="handleClick" @input="handleInput" :placeholder="placeholder"></div>
        <div class="tags-container">
            <el-tag v-for="(label, key) in tags" :key="key" class="tag-item" @click="handleTagClick(key)">
                {{ label }}
            </el-tag>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, h, render, useTemplateRef, onMounted, nextTick } from 'vue'
import { ElTag } from 'element-plus'
import { CursorManager } from '../utils/CursorManager';

type valueType = "text" | "tag";

interface TagInputProps {
    modelValue: string;
    tags?: Record<string, string>;
    placeholder?: string;
}

const props = withDefaults(defineProps<TagInputProps>(), {
    modelValue: "",
    tags: () => ({}),
    placeholder: "请输入内容或点击下方标签添加..."
});

const emit = defineEmits<{
    'update:modelValue': [value: string]
}>();

const editableContainer = useTemplateRef<HTMLElement>("editableContainer");
const currentRange = ref<Range | null>(null);

// 光标管理实例
let cursorManager: CursorManager;

// 解析字符串为内容数组
const parseStringToContent = (str: string): Array<{ type: valueType; value: string }> => {
    if (!str) return [];

    const content: Array<{ type: valueType; value: string }> = [];
    const tagRegex = /\{([^}]+)\}/g;
    let lastIndex = 0;
    let match;

    while ((match = tagRegex.exec(str)) !== null) {
        // 添加标签前的文本
        if (match.index > lastIndex) {
            const textBefore = str.slice(lastIndex, match.index);
            if (textBefore) {
                content.push({ type: 'text', value: textBefore });
            }
        }

        // 添加标签
        const tag = match[1] || "";
        content.push({ type: 'tag', value: tag });

        lastIndex = match.index + match[0].length;
    }

    // 添加最后剩余的文本
    if (lastIndex < str.length) {
        const textAfter = str.slice(lastIndex);
        if (textAfter) {
            content.push({ type: 'text', value: textAfter });
        }
    }

    return content;
};

// 将内容数组转换为字符串
const contentToString = (content: Array<{ type: valueType; value: string }>): string => {
    return content.map(item => item.type === 'text' ? item.value : `{${item.value}}`).join('');
};

// 初始化组件
const initComponent = () => {
    if (!editableContainer.value) return;

    // 初始化光标管理器
    cursorManager = new CursorManager(editableContainer.value);

    // 初始化时把 modelValue 转换为真实 dom
    renderModelValue();
};

// 将 modelValue 渲染到 dom 中
const renderModelValue = () => {
    if (!editableContainer.value || !props.modelValue) return;

    editableContainer.value.innerHTML = '';

    // 对 modelValue 进行解析
    const content = parseStringToContent(props.modelValue);

    content.forEach(item => {
        if (item.type === 'text') {
            const textNode = document.createTextNode(item.value);
            editableContainer.value?.appendChild(textNode);
        } else if (item.type === 'tag') {
            const tagContainer = createTagContainer(item.value);
            editableContainer.value?.appendChild(tagContainer);
        }
    });
};

// 创建一个 ElTag 标签的虚拟节点
const createTagElement = (tag: string, onRemove: () => void) => {
    const displayText = props.tags?.[tag] || tag;

    return h(ElTag, {
        key: tag,
        closable: true,
        onClose: (e: Event) => {
            e.stopPropagation();
            onRemove();
        }
    }, {
        default: () => displayText
    });
};

// 创建标签容器 dom 元素
const createTagContainer = (tag: string) => {
    const container = document.createElement('span');
    container.style.display = 'inline-block';
    container.contentEditable = 'false';
    container.dataset.tag = tag;
    container.className = 'tag-container';

    // 定义删除函数
    const removeTag = () => {
        cursorManager && cursorManager.removeElementAndAdjustCursor(container);

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

    const content: Array<{ type: valueType; value: string }> = [];

    // 遍历编辑器中的所有子节点
    Array.from(editableContainer.value.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            if (text) {
                content.push({ type: 'text', value: text });
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            if (element.classList.contains('tag-container')) {
                const tagValue = element.dataset.tag;
                if (tagValue) {
                    content.push({ type: 'tag', value: tagValue });
                }
            }
        }
    });

    emit('update:modelValue', contentToString(content));
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

    nextTick(() => {
        updateModelValue();
        saveCursorPosition();
    });
};

// 删除标签的公用方法
const removeTagAndUpdate = (element: HTMLElement) => {
    if (cursorManager) {
        cursorManager.removeElementAndAdjustCursor(element);
    }
    nextTick(() => {
        updateModelValue();
        saveCursorPosition();
    });
};

// 检查元素是否为标签容器
const isTagContainer = (element: any): element is HTMLElement => {
    return element?.classList?.contains('tag-container');
};

// 查找要删除的标签元素
const findTagToDelete = (startContainer: Node, startOffset: number): HTMLElement | null => {
    if (!editableContainer.value) return null;

    // 情况1: 光标在标签容器内部
    let currentNode: Node | null = startContainer;
    while (currentNode && currentNode !== editableContainer.value) {
        if (currentNode.nodeType === Node.ELEMENT_NODE && isTagContainer(currentNode)) {
            return currentNode;
        }
        currentNode = currentNode.parentNode;
    }

    // 情况2: 光标在文本节点开始位置，检查前一个兄弟节点
    if (startOffset === 0 && startContainer.nodeType === Node.TEXT_NODE) {
        const prevSibling = startContainer.previousSibling;
        if (isTagContainer(prevSibling)) {
            return prevSibling;
        }
    }

    // 情况3: 光标在容器根节点，检查前面的子节点
    if (startContainer === editableContainer.value && startOffset > 0) {
        const prevChild = editableContainer.value.childNodes[startOffset - 1];
        if (isTagContainer(prevChild)) {
            return prevChild;
        }
    }

    // 情况4: 光标在容器末尾，检查最后一个子元素
    if (startContainer === editableContainer.value) {
        const childNodes = editableContainer.value.childNodes;
        if (startOffset === childNodes.length) {
            const lastChild = editableContainer.value.lastElementChild;
            if (isTagContainer(lastChild)) {
                return lastChild;
            }
        }
    }

    return null;
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

        // 查找要删除的标签
        const tagToDelete = findTagToDelete(startContainer, startOffset);
        if (tagToDelete) {
            e.preventDefault();
            removeTagAndUpdate(tagToDelete);
            return;
        }
    }

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
            margin: 2px 4px;
            vertical-align: baseline;
            line-height: 1.5;

            .el-tag {
                display: inline-flex;
                align-items: center;
                cursor: default;
                user-select: none;
                margin: 0;
                vertical-align: baseline;
                font-size: 12px;
                height: 22px;
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
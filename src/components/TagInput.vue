<template>
    <div class="tag-input-container">
        <div ref="editableContainer" class="editable-area" contenteditable="true" @keydown="handleKeyDown"
            @focus="handleFocus" @click="handleClick" @input="handleInput" @blur="handleBlur"
            :placeholder="placeholder"></div>
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
    tags?: Record<string, string>;
    placeholder?: string;
}

const props = withDefaults(defineProps<TagInputProps>(), {
    tags: () => ({}),
    placeholder: "请输入内容或点击下方标签添加..."
});

const model = defineModel({ default: "", required: true });
const editableContainer = useTemplateRef<HTMLElement>("editableContainer");
const currentRange = ref<Range | null>(null);

let cursorManager: CursorManager;
const initComponent = () => {
    if (!editableContainer.value) return;
    cursorManager = new CursorManager(editableContainer.value);
    renderModel();
};


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

// 将 model 渲染到 dom 中
const renderModel = () => {
    if (!editableContainer.value || !model.value) return;

    editableContainer.value.innerHTML = '';

    const content = parseStringToContent(model.value);

    content.forEach(item => {
        if (item.type === 'text') {
            const textNode = document.createTextNode(item.value);
            editableContainer.value?.appendChild(textNode);
        } else if (item.type === 'tag') {
            if (props.tags && props.tags[item.value]) {
                const tagContainer = createTagContainer(item.value);
                editableContainer.value?.appendChild(tagContainer);
            } else {
                const textNode = document.createTextNode(`{${item.value}}`);
                editableContainer.value?.appendChild(textNode);
            }
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

    // 创建虚拟节点并渲染到容器中
    const vnode = createTagElement(tag, () => removeTag(container));
    render(vnode, container);

    return container;
};

const updateModelValue = () => {
    if (!editableContainer.value) return;

    const content: Array<{ type: valueType; value: string }> = [];

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

    model.value = contentToString(content);
};

// 保存当前光标位置
const saveCursorPosition = () => {
    if (cursorManager) {
        currentRange.value = cursorManager.saveCurrentRange();
    }
};

const handleFocus = () => {
    saveCursorPosition();
};

const handleClick = () => {
    saveCursorPosition();
};

const handleInput = () => {
    saveCursorPosition()
};

const handleBlur = () => {
    updateModelValue();
};

// 点击标签添加到输入框中
const handleTagClick = (tag: string) => {
    if (!editableContainer.value || !cursorManager) return;

    if (!props.tags || !props.tags[tag]) return;

    const tagContainer = createTagContainer(tag);

    // 获取当前保存的光标位置，如果没有则使用默认位置
    if (!currentRange.value || !editableContainer.value.contains(currentRange.value.commonAncestorContainer)) {
        currentRange.value = cursorManager.getDefaultRange();
    }

    // 在指定位置插入标签
    cursorManager.insertElementAtRange(tagContainer, currentRange.value);
};

const removeTag = (element: HTMLElement) => {
    if (cursorManager) {
        cursorManager.removeElementAndAdjustCursor(element);
    }

    nextTick(saveCursorPosition);
};

// 检查元素是否为标签容器
const isTagContainer = (element: any): element is HTMLElement => {
    return element?.classList?.contains('tag-container');
};

// 获取光标前面的元素（用于删除标签判断）
const getPreviousElement = (startContainer: Node, startOffset: number): Node | null => {
    if (!editableContainer.value) return null;

    // 1. 如果光标在文本节点中
    if (startContainer.nodeType === Node.TEXT_NODE) {
        if (startOffset === 0) {
            return startContainer.previousSibling;
        }
        return null;
    }

    /**
     * 2. 如果光标在容器根节点 
     * 当删除到 ElTag 标签，光标会跳转到容器根节点。因为 ElTag 被设置为不可编辑，当删除到标签时，光标会默认跳转到最近的可编辑容器
     */
    if (startContainer === editableContainer.value && startOffset > 0) {
        const childNodes = Array.from(editableContainer.value.childNodes);

        // 从光标前一个位置开始向前查找第一个元素节点
        for (let i = startOffset - 1; i >= 0; i--) {

            // 跳过空节点，不然会导致删除标签时光标无法定位，最终导致输入框被错误的清空
            const node = childNodes[i];
            if (!node) continue;

            // 遇到非空文本节点，不删除标签
            if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
                return null;
            }

            // 找到元素节点，返回它
            if (node.nodeType === Node.ELEMENT_NODE) {
                return node;
            }
        }
    }

    return null;
};

// 处理键盘删除事件
// 文本节点采用原生删除，遇到标签则利用方法删除 (否则会有 bug)
const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Backspace') {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);

        // 如果有选中内容，让浏览器自然处理删除
        if (!range.collapsed) {
            nextTick(saveCursorPosition);
            return;
        }

        const { startContainer, startOffset } = range;
        const prevElement = getPreviousElement(startContainer, startOffset);

        // 如果前面的元素是标签容器，删除该标签
        if (isTagContainer(prevElement)) {
            e.preventDefault();
            removeTag(prevElement);
            return;
        }

        // 其他情况让浏览器自然处理删除
        nextTick(saveCursorPosition);
    }
};

onMounted(initComponent);
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
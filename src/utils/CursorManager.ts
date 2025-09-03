/**
 * 光标管理类
 * 用于管理可编辑区域的光标位置和操作
 */
export class CursorManager {
    private container: HTMLElement;

    constructor(container: HTMLElement) {
        this.container = container;
    }

    /**
     * 保存当前光标位置
     * @returns 当前光标的 Range 对象，如果没有光标则返回 null
     */
    saveCurrentRange(): Range | null {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            // 确保光标在编辑器内
            if (this.container.contains(range.commonAncestorContainer)) {
                return range.cloneRange();
            }
        }
        return null;
    }

    /**
     * 恢复光标位置
     * @param range 要恢复的 Range 对象
     */
    restoreRange(range: Range) {
        const selection = window.getSelection();
        if (selection && range) {
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    /**
     * 在指定位置插入元素
     * @param element 要插入的元素
     * @param range 插入位置的 Range 对象
     */
    insertElementAtRange(element: HTMLElement, range: Range) {
        const selection = window.getSelection();
        if (selection && range) {
            // 删除选中的内容（如果有）
            range.deleteContents();

            // 插入标签元素
            range.insertNode(element);

            // 将光标移动到元素后
            range.setStartAfter(element);
            range.setEndAfter(element);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    /**
     * 获取默认插入位置（容器末尾）
     * @returns 指向容器末尾的 Range 对象
     */
    getDefaultRange(): Range {
        const range = document.createRange();
        range.selectNodeContents(this.container);
        range.collapse(false); // 移到末尾
        return range;
    }

    /**
     * 移动光标到容器末尾
     */
    moveCursorToEnd() {
        const range = this.getDefaultRange();
        this.restoreRange(range);
    }

    /**
     * 检查光标是否在指定元素内或旁边
     * @param element 要检查的元素
     * @returns 如果光标在元素内或旁边返回 true
     */
    isCursorNearElement(element: HTMLElement): boolean {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return false;

        // const range = selection.getRangeAt(0);
        const anchorNode = selection.anchorNode;

        if (!anchorNode) return false;

        // 检查光标是否在元素内
        if (element.contains(anchorNode)) {
            return true;
        }

        // 检查光标是否在元素旁边
        if (anchorNode.nodeType === Node.TEXT_NODE) {
            const parentElement = anchorNode.parentElement;
            if (parentElement &&
                (parentElement.previousElementSibling === element ||
                    parentElement.nextElementSibling === element)) {
                return true;
            }
        }

        return false;
    }

    /**
     * 删除指定元素并调整光标位置
     * @param element 要删除的元素
     */
    removeElementAndAdjustCursor(element: HTMLElement) {
        // 创建一个新的 Range 指向元素前面
        const range = document.createRange();
        range.setStartBefore(element);
        range.setEndBefore(element);

        // 删除元素
        element.remove();

        // 恢复光标位置
        this.restoreRange(range);
    }
}

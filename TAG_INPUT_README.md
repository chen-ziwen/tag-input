# TagInput 组件使用说明

一个支持文字和标签混合输入的 Vue 3 组件，基于 Element Plus 开发。

## 功能特性

- ✅ **文字和标签混合输入**：支持在可编辑区域中插入文字和标签
- ✅ **智能光标管理**：点击标签时会在当前光标位置插入
- ✅ **键盘删除支持**：使用 Backspace 键可以整体删除标签
- ✅ **标签关闭功能**：每个标签都有关闭按钮，可以单独删除
- ✅ **双向数据绑定**：完整的 v-model 支持
- ✅ **TypeScript 支持**：完整的类型定义

## 安装依赖

```bash
npm install vue@^3.0.0 element-plus
```

## 基础用法

```vue
<template>
  <TagInput 
    v-model="inputValue" 
    :available-tags="['礼物', '弹幕', '节日']"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TagInput, { type TagInputModelValue } from './components/TagInput.vue'

const inputValue = ref<TagInputModelValue>({
  tags: ['礼物', '弹幕', '节日'],
  value: [
    { type: 'text', value: '欢迎来到直播间！' },
    { type: 'tag', value: '礼物' },
    { type: 'text', value: '感谢支持！' }
  ]
})
</script>
```

## API 接口

### Props

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| modelValue | `TagInputModelValue` | `{ tags: [], value: [] }` | 组件的值，支持 v-model |
| availableTags | `string[]` | `['礼物', '弹幕', '节日']` | 可选的标签列表 |

### Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| update:modelValue | `(value: TagInputModelValue)` | 值变化时触发 |

### 数据结构

```typescript
interface TagInputModelValue {
  tags: string[];  // 可选标签列表
  value: Array<{   // 输入框内容
    type: 'text' | 'tag';
    value: string;
  }>;
}
```

## 使用场景

### 1. 直播间互动消息
```vue
<TagInput 
  v-model="chatMessage"
  :available-tags="['礼物', '弹幕', '节日', '活动']"
/>
```

### 2. 文章标签编辑
```vue
<TagInput 
  v-model="articleContent"
  :available-tags="['前端', 'Vue', 'JavaScript', 'TypeScript']"
/>
```

### 3. 评论系统
```vue
<TagInput 
  v-model="commentContent"
  :available-tags="['点赞', '分享', '收藏']"
/>
```

## 操作说明

### 基本操作
1. **文字输入**：直接在输入框中输入文字
2. **插入标签**：点击下方的标签按钮，标签会在光标位置插入
3. **删除标签**：
   - 使用 `Backspace` 键可以整体删除光标前的标签
   - 点击标签上的关闭按钮单独删除该标签

### 光标管理
- 组件会自动跟踪光标位置
- 点击标签时会在当前光标位置插入
- 如果没有光标焦点，默认在末尾插入

## 样式自定义

组件使用 SCSS 编写，支持深度样式自定义：

```vue
<style>
/* 自定义输入框样式 */
:deep(.tag-input-container .editable-area) {
  border-color: #custom-color;
  border-radius: 8px;
}

/* 自定义标签样式 */
:deep(.tag-container .el-tag) {
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
  border: none;
  color: white;
}
</style>
```

## 注意事项

1. **Element Plus 依赖**：组件依赖 Element Plus 的 ElTag 组件
2. **浏览器兼容性**：需要支持 `contenteditable` 和 `Selection API` 的现代浏览器
3. **光标状态**：组件会自动管理光标状态，无需手动处理
4. **数据响应性**：所有操作都会自动更新 modelValue，触发响应式更新

## 高级用法

### 监听值变化
```vue
<script setup>
const handleValueChange = (newValue: TagInputModelValue) => {
  console.log('内容已更新:', newValue);
  
  // 提取纯文本
  const plainText = newValue.value
    .filter(item => item.type === 'text')
    .map(item => item.value)
    .join('');
    
  // 提取标签
  const tags = newValue.value
    .filter(item => item.type === 'tag')
    .map(item => item.value);
}
</script>
```

### 动态添加可选标签
```vue
<script setup>
const availableTags = ref(['初始标签']);

const addNewTag = (tagName: string) => {
  if (!availableTags.value.includes(tagName)) {
    availableTags.value.push(tagName);
  }
}
</script>
```

## 开发和调试

1. 启动开发服务器：`npm run dev`
2. 访问 `http://localhost:5173` 查看演示
3. 打开浏览器控制台可以看到数据变化日志

## 技术实现

- **Vue 3 Composition API**：使用最新的 Vue 3 语法
- **TypeScript**：完整的类型支持
- **光标管理类**：封装了光标操作逻辑
- **虚拟 DOM 渲染**：使用 Vue 的 render 函数渲染标签
- **事件处理**：完整的键盘和鼠标事件支持

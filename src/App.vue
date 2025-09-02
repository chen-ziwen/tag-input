<script setup lang="ts">
import { ref } from 'vue'
import TagInput from './components/TagInput.vue';
import type { TagInputModelValue } from './components/TagInput.vue';

// 可选标签列表
const availableTags = ref(["礼物", "弹幕", "用户", "数量", "时间"]);

// value 值是一个对象数据
const mockValue = ref<TagInputModelValue>({
  tags: availableTags.value,
  value: [
    { type: "tag", value: "用户" },
    { type: "text", value: "赠送" },
    { type: "tag", value: "礼物" },
    { type: "text", value: "x" },
    { type: "tag", value: "数量" },
    { type: "text", value: "参与投票" },
  ]
});

// 处理值变化
const handleValueChange = (newValue: TagInputModelValue) => {
  console.log('值已更新:', newValue);
};
</script>

<template>
  <div class="app-container">
    <h2>Tag 输入演示</h2>

    <div class="demo-section">
      <h3>组件演示</h3>
      <TagInput v-model="mockValue" :available-tags="availableTags" @update:modelValue="handleValueChange" />
    </div>

  </div>
</template>

<style scoped>
.app-container {
  max-width: 900px;
  margin: 20px auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>

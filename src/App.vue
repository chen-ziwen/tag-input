<script setup lang="ts">
import { ref } from 'vue'
import TagInput from './components/TagInput.vue';


const tags = {
  userName: "用户",
  message: "弹幕",
  giftName: "礼物",
  giftCount: "数量"
};

const mockValue = ref("{userName}赠送{giftName}x{giftCount}，感谢{userName}大哥，祝您发大财！");

// 处理值变化
const handleValueChange = (newValue: string) => {
  console.log('值已更新:', newValue);
};
</script>

<template>
  <div class="app-container">
    <h2>Tag 输入演示</h2>

    <div class="demo-section">
      <h3>组件演示</h3>
      <TagInput v-model="mockValue" @update:modelValue="handleValueChange" :tags="tags" />
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

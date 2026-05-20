<template>
  <view class="app-root">
    <slot />
  </view>
</template>

<script setup>
</script>

<style>
page {
  min-height: 100%;
  background: #f4f8fc;
  color: #132033;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
}

.app-root {
  min-height: 100vh;
}
</style>

<script setup>
import { ref, computed } from 'vue'

// 故障数据库：在这里增加你的 3D 打印心得
const issues = ref([
  {
    id: 'B01',
    title: '第一层不粘 (Adhesion Fail)',
    desc: '模型第一层无法附着在打印床上，导致后续打印失败。',
    fix: '清洗 PEI 板，增加热床温度 5°C，检查 Z 轴偏移。',
    kitUrl: 'https://xxx.com/pei-cleaner', // 你的网店链接
    price: '¥19'
  },
  {
    id: 'E01',
    title: '挤出机堵塞 (Clogged Nozzle)',
    desc: '不吐丝或出丝非常细，伴随挤出机咔咔响。',
    fix: '进行 Cold Pull，或清理喷嘴杂质。',
    kitUrl: 'https://xxx.com/nozzle-kit',
    price: '¥35'
  }
])

const searchQuery = ref('')

// 搜索过滤逻辑
const filteredIssues = computed(() => {
  return issues.value.filter(i => 
    i.title.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})
</script>

<template>
  <div class="container">
    <header style="margin-bottom: 50px; border-left: 4px solid var(--primary-green); padding-left: 15px;">
      <h1 style="margin:0; font-size: 24px;">FOREST_WOOD // <span style="color:var(--primary-green)">FIX_IT</span></h1>
      <p style="font-size: 12px; color: #555;">3D打印故障自助排查系统 V1.0</p>
    </header>

    <!-- 搜索 -->
    <input 
      v-model="searchQuery"
      type="text" 
      placeholder="输入关键词，例如：不粘、堵头..." 
      class="search-input"
    />

    <!-- 列表渲染 -->
    <div v-for="item in filteredIssues" :key="item.id" class="issue-card">
      <div class="issue-id">REF_{{ item.id }}</div>
      <h2 class="issue-title">{{ item.title }}</h2>
      <p style="font-size: 14px; color: #aaa;">{{ item.desc }}</p>
      
      <div style="background: #000; padding: 10px; font-size: 13px; border-left: 2px solid #333;">
        <span style="color: #666; font-weight: bold;">对策：</span> {{ item.fix }}
      </div>

      <!-- 赚钱按钮 -->
      <a :href="item.kitUrl" target="_blank" class="btn-buy">
        获取对应配件包 ({{ item.price }})
      </a>
    </div>

    <footer style="margin-top: 100px; font-size: 10px; color: #333; text-align: center;">
      HACKER_HUANRAN @ 2026 // GITHUB_PAGES_DEPLOYED
    </footer>
  </div>
</template>

<style>
/* 引用刚才写的 main.css */
@import "./assets/main.css";
</style>
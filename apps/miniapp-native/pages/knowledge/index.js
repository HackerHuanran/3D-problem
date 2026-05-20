Page({
  data: {
    query: '',
    filteredSections: [],
    sections: [
      {
        id: 'starter',
        title: '新手入门',
        desc: '先理解首层、温度、回抽、风扇和调平这些最常见概念。',
        items: ['为什么第一层最重要', '什么情况下先调平再改切片', '新手最容易忽略的 3 个参数'],
      },
      {
        id: 'params',
        title: '参数解释',
        desc: '把喷嘴温度、热床温度、打印速度、层高和回抽讲清楚。',
        items: ['喷嘴温度高低分别会带来什么现象', '回抽距离和回抽速度怎么理解', '层高为什么会影响表面和时间'],
      },
      {
        id: 'maintenance',
        title: '维护常识',
        desc: '适合放喷嘴清理、热床清洁、耗材保存和日常检查。',
        items: ['多久该清一次热床', '喷嘴堵了先排查什么', '耗材为什么一定要防潮'],
      },
    ],
  },

  onLoad() {
    this.setData({ filteredSections: this.data.sections })
  },

  onSearchInput(e) {
    const query = String(e.detail.value || '').trim()
    const q = query.toLowerCase()
    const filteredSections = !q
      ? this.data.sections
      : this.data.sections
        .map((section) => {
          const items = (section.items || []).filter((item) => String(item).toLowerCase().includes(q))
          const matchSection = String(section.title + section.desc).toLowerCase().includes(q)
          if (!items.length && !matchSection) return null
          return { ...section, items: items.length ? items : section.items }
        })
        .filter(Boolean)

    this.setData({ query, filteredSections })
  },
})

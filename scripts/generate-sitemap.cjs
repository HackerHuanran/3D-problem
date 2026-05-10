// 构建后自动生成 sitemap.xml
const fs = require('fs')
const path = require('path')

const SITE = 'https://www.3dproblem.com' // 替换成你的实际域名

// 直接读取问题 ID（从 problems.js 提取）
const problemsSource = fs.readFileSync(
  path.join(__dirname, '../src/data/problems.js'), 'utf-8'
)
const ids = [...problemsSource.matchAll(/id:\s*'([^']+)'/g)].map(m => m[1])

const today = new Date().toISOString().split('T')[0]

const staticPages = [
  { path: '/',          priority: '1.0', changefreq: 'weekly'  },
  { path: '/filament',  priority: '0.8', changefreq: 'monthly' },
  { path: '/services',  priority: '0.7', changefreq: 'weekly'  },
]

const problemPages = ids.map(id => ({
  path: `/p/${id}`,
  priority: '0.9',
  changefreq: 'monthly',
}))

const allPages = [...staticPages, ...problemPages]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(p => `  <url>
    <loc>${SITE}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`

fs.writeFileSync(path.join(__dirname, '../public/sitemap.xml'), xml)
console.log(`✓ sitemap.xml 生成完毕，共 ${allPages.length} 个 URL`)

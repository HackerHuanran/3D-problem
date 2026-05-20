# 3D-problem

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

## CloudBase Environment Notes

当前仓库建议统一使用“微信侧创建”的 CloudBase 环境，这样同一套数据才能同时给 Web 和小程序使用。

### 关键环境变量

在项目根目录 `.env` 中配置：

```sh
VITE_TCB_ENV_ID=你的CloudBase环境ID
VITE_TCB_CDN_BASE=https://你的环境对应CDN域名
VITE_TCB_COS_ORIGIN=https://你的环境对应COS域名
```

### 常用同步命令

```sh
npm run sync:problems
npm run sync:problem-meta
npm run sync:user-problems
```

### 旧环境迁移到新环境

如果你之前的 Web 使用的是“腾讯云侧创建”的环境，而现在要迁移到“微信侧创建”的新环境，可运行：

```sh
export CLOUDBASE_SECRET_ID=你的SecretId
export CLOUDBASE_SECRET_KEY=你的SecretKey
export SOURCE_ENV_ID=旧环境ID
export TARGET_ENV_ID=新环境ID
npm run migrate:cloudbase
```

默认会迁移这些核心集合：

- `problems`
- `profiles`
- `problem_favorites`
- `problem_history`
- `user_problems`
- `problem_meta`

如需只迁移部分集合，可额外指定：

```sh
export MIGRATE_COLLECTIONS=problems,profiles,problem_meta
```

如果两边环境无法被同一组 SecretId / SecretKey 同时访问，可改用“导出 JSON 再导入”的方式：

```sh
export CLOUDBASE_SECRET_ID=你的SecretId
export CLOUDBASE_SECRET_KEY=你的SecretKey
export SOURCE_ENV_ID=旧环境ID
npm run export:cloudbase
```

默认会导出到：

- `exports/cloudbase/profiles.json`
- `exports/cloudbase/problem_favorites.json`
- `exports/cloudbase/problem_history.json`
- `exports/cloudbase/user_problems.json`
- `exports/cloudbase/problem_meta.json`

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh1
npm run build
```

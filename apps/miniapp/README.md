# miniapp

这里放小程序端应用壳，当前按 `uni-app + Vue3` 的方向搭建。

当前已落地：

1. `src/pages/home`：问题搜索首页
2. `src/pages/problem-detail`：问题详情页
3. `src/pages/diagnosis`：移动端初筛诊断页
4. `src/pages/account`：登录 / 找回密码 / 收藏与浏览统计
5. `src/lib/problem-service.js`：接入 `packages/shared` 的共享问题逻辑
6. `src/lib/auth.js` / `src/lib/user-data.js`：真实登录、收藏、历史记录

当前目标：

- 小程序保留独立页面层
- 共用 `packages/shared` 的问题模型、搜索、诊断基础规则
- 后续继续接：
  - 拍照识别
  - 账号登录
  - 收藏/历史
  - 云端问题库接口

说明：

- 这一步先把源码骨架建好，不影响现有 web
- 当前已经接入真实 CloudBase 集合：
  - `problems`
  - `profiles`
  - `problem_favorites`
  - `problem_history`

## 如何在微信开发者工具查看

当前这版已经有完整源码，但还没有在仓库里正式装好 `uni-app` 构建链。

你要查看时，推荐这样做：

1. 新建一个真正的 uni-app 项目壳
2. 把当前目录 `apps/miniapp/src` 里的内容复制进去
3. 在那个 uni-app 项目里配置和 web 一样的 `VITE_TCB_ENV_ID`
4. 然后在 HBuilderX 或微信开发者工具中运行

更直接一点说：

- 现在我已经帮你把“小程序业务源码”写好了
- 但还差一个“正式可编译的 uni-app 工程外壳”

如果你愿意，我下一步可以继续直接帮你做：

1. 在仓库里把 uni-app 工程也补完整
2. 告诉你怎么生成微信小程序产物
3. 再教你怎么导入微信开发者工具预览

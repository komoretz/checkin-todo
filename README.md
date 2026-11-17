# 打卡待办 · Checkin Todo

极简打卡待办 PWA。数据全部保存在本机，无后端、无登录，可安装到手机桌面并离线使用。

技术栈：**React 18 + Vite 5 + 原生 CSS + 手写 Service Worker**（无 UI 框架、无状态管理库，构建产物约 53 KB gzip）。

---

## 1. 项目目录结构

```
checkin-todo/
├── index.html                    # 入口 HTML（含 viewport-fit=cover / PWA meta）
├── package.json
├── vite.config.js
├── public/
│   ├── manifest.webmanifest      # 应用清单（安装 / 图标 / 独立窗口）
│   ├── sw.js                     # Service Worker（离线缓存）
│   └── icons/                    # 192 / 512 / maskable / apple-touch 图标
├── scripts/
│   ├── gen-icons.mjs             # 纯 Node 生成 PNG 图标（无三方依赖）
│   └── test-logic.mjs            # 核心逻辑自测（19 项，node 直接跑）
└── src/
    ├── main.jsx                  # 挂载 + 注册 SW
    ├── App.jsx                   # 页面编排与交互（日期状态、弹层、安装提示）
    ├── styles.css                # 设计变量 / 组件样式 / 深色模式 / 安全区
    ├── lib/
    │   ├── date.js               # 日期工具（YYYY-MM-DD 字符串、跨月跨年、相对日）
    │   ├── storage.js            # localStorage 读写与打卡主键
    │   └── todos.js              # ★ 领域逻辑：过滤规则、排序、进度、校验
    ├── hooks/
    │   └── useStore.js           # 状态中枢 + 持久化 + 主题应用 + useToday
    └── components/
        ├── DateNav.jsx           # 日期切换 / 进度条 / 回到今天 / 设置入口
        ├── TodoList.jsx          # 未完成 + 已完成分组
        ├── TodoItem.jsx          # 勾选框 / 标题 / 类型标签 / 编辑
        ├── EmptyState.jsx        # 空状态
        ├── Fab.jsx               # 悬浮添加按钮
        ├── TodoEditor.jsx        # 新建 / 编辑弹层（表单校验）
        ├── SettingsSheet.jsx     # 设置（主题 / 安装 / 清空数据）
        ├── Sheet.jsx             # 通用弹层（遮罩、Esc、锁滚动）
        └── ConfirmDialog.jsx     # 危险操作确认
```

---

## 2. 数据模型与本地存储方案

### 模型

```ts
type TodoType = 'daily' | 'specific'

interface Todo {
  id: string            // crypto.randomUUID()
  title: string         // 必填，≤ 60 字
  type: TodoType        // daily=每日循环，specific=特定日期
  startDate: string | null    // daily：开始日期（含），YYYY-MM-DD
  endDate: string | null      // daily：结束日期（含），null=长期
  specificDate: string | null // specific：唯一出现的那天
  note: string
  createdAt: number     // 排序用（组内按创建时间）
}

interface CheckIn {
  todoId: string
  date: string          // YYYY-MM-DD
  completed: true
}
```

### 存储（localStorage）

| Key | 值类型 | 说明 |
| --- | --- | --- |
| `checkin.todos.v1` | `Todo[]` | 数组，整体读写；量小、实现简单 |
| `checkin.checkins.v1` | `{ [key]: CheckIn }` | 哈希表，`key = todoId::date`，按天 O(1) 读写 |
| `checkin.theme.v1` | `'system' \| 'light' \| 'dark'` | 外观偏好 |

设计要点：

- **按天独立**：打卡主键含日期，每日循环待办每天一条记录，互不影响。
- **取消即删除**：取消勾选直接删掉该条记录，不保存 `completed: false`，数据保持干净。
- **级联清理**：删除待办时同步清理它的全部打卡记录。
- **读写容错**：JSON 解析失败 / 隐私模式写入失败只告警不崩溃，降级为空数据。
- 版本号后缀 `.v1` 便于未来做数据迁移；所有日期用 `YYYY-MM-DD` 字符串，可直接比较，不受时区与夏令时影响。

---

## 3. 页面组件

| 组件 | 职责 |
| --- | --- |
| `App` | 持有 `date` 状态、弹层开关、安装提示；跨零点自动跟随新的一天 |
| `DateNav` | 前/后一天、点击日期唤起原生日期选择器、进度条、回到今天、设置入口 |
| `TodoList` | 排序结果分组渲染；空数组时渲染 `EmptyState` |
| `TodoItem` | 圆形勾选框（SVG 描边动画）+ 标题 + `每日/单次` 标签 + 备注 + 编辑 |
| `TodoEditor` | 标题、类型分段控件、日期字段、备注；提交前校验；编辑态可删除 |
| `SettingsSheet` | 外观三档、安装引导（含 iOS 提示）、数据统计、清空数据 |
| `Sheet` / `ConfirmDialog` | 底部弹层（桌面居中）与危险操作二次确认 |

---

## 4. 核心逻辑：判断某天应显示哪些待办

`src/lib/todos.js`

```js
export function isTodoActiveOn(todo, date) {
  // 特定日期：只在这一天出现
  if (todo.type === 'specific') return todo.specificDate === date

  // 每日循环：startDate <= date <= endDate（两端都包含）
  if (todo.startDate && date < todo.startDate) return false
  if (todo.endDate && date > todo.endDate) return false
  return true
}
```

排序与进度：

```js
listForDate(todos, checkins, date)
// 1. filter(isTodoActiveOn)  2. 附加 completed（查 checkins）  3. 未完成在前，同组按 createdAt 升序

progressOf(entries) // => { total, done, percent }
```

边界行为（已被 `npm run test` 覆盖）：

- 开始日期当天、结束日期当天都**可见**；
- `endDate = null` 表示长期有效；
- 跨年区间（12/30 – 1/2）过滤正确；
- 每日循环与特定日期可在同一天共存；
- 取消勾选删除记录、删除待办清理历史。

---

## 5. 如何安装为桌面 APP

PWA 需通过 **HTTPS 或 localhost** 访问（Service Worker 的硬性要求）。

### Android / Chrome / Edge

打开页面 → 地址栏右侧「安装」图标，或菜单「安装应用 / 添加到主屏幕」。装好后从桌面图标启动，全屏无地址栏，断网可用。

### iOS / Safari（iPhone、iPad）

Safari 打开页面 → 底部「分享」→「添加到主屏幕」→ 添加。iOS 不支持 `beforeinstallprompt`，因此应用里只在设置页给出文字引导。

### 桌面 Chrome / Edge

地址栏右侧安装图标 → 安装，会生成独立窗口应用。

> 部署提示：Manifest 的 `start_url` / `scope` 为 `/`，请部署在域名根目录；若必须部署到子路径，把 `vite.config.js` 的 `base` 与 manifest、`sw.js` 中的路径一并改为该子路径。

---

## 6. 运行步骤

```bash
cd checkin-todo
npm install          # 安装依赖（react / vite）
npm run dev          # 开发：http://localhost:5173，手机同 WiFi 可用局域网 IP 访问
npm run build        # 构建到 dist/
npm run preview      # 本地预览生产构建：http://localhost:4173
npm run test         # 核心逻辑自测（19 项）
npm run icons        # 重新生成图标（改配色时用）
```

真机调试：`npm run dev` 后终端会打印 `Network: http://192.168.x.x:5173`，手机浏览器打开即可；`npm run build && npm run preview` 后用局域网 IP 访问可测试「添加到主屏幕」。

部署：把 `dist/` 上传到任意静态托管（Vercel / Netlify / Cloudflare Pages / Nginx），确保开启 HTTPS 即可获得完整 PWA 安装能力。

---

## 7. 部署到 GitHub Pages（手机安装推荐路径）

代码已用相对路径构建（`vite.config.js` 的 `base: './'`，manifest / Service Worker 同样基于自身目录计算），因此部署在 `https://用户名.github.io/仓库名/` 这样的**子目录**下也能正常安装与离线缓存，无需改任何配置。

```bash
# 1. 在 GitHub 新建一个空仓库（Public；免费账号的 Pages 只支持公开仓库）
# 2. 关联并推送
git remote add origin https://github.com/<用户名>/<仓库名>.git
git push -u origin main
```

3. 打开仓库 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**（只需设置一次）。
4. 推送后 `.github/workflows/deploy.yml` 会自动 `npm ci → test → build → 发布`，约 1 分钟完成。
5. 访问 `https://<用户名>.github.io/<仓库名>/`，手机打开后即可「添加到主屏幕」。

之后每次改代码只需 `git push`，Actions 自动重新构建发布，不用手动上传 dist。

> 注意：GitHub Pages 在国内部分网络下访问不稳定。若手机打不开，改用 Cloudflare Pages / Netlify 上传 `dist.zip` 即可，链接换成它生成的 `*.pages.dev` / `*.netlify.app`。

---

## 数据说明

所有数据仅保存在当前浏览器（localStorage），不联网、不上传。清理浏览器数据、卸载应用或换设备都会导致记录丢失，重要记录请自行留意。

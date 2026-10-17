# dsh-session-organizer

[English](#english) | [中文](#中文)

<a id="english"></a>
**Two-level session organizer for the DeepSeek Harness (DSH) web sidebar** — organize workspaces into custom **groups** (level 1) and sessions into per-workspace **folders** (level 2, nesting supported). Drag & drop everywhere, live status dots, title + full-text message search, zero runtime dependencies. Replaces the combination of `dsh-workspace-hub` + `dsh-session-categories` with a single plugin.

> Tested against DSH `0.1.5-rc.1` (web profile). MIT licensed.

<a id="中文"></a>
两级会话组织器插件 —— 为 DeepSeek Harness Web 侧边栏提供**两级分类**：

- **第一级（工作区分组）**：把所有工作区按自定义分组归类，支持拖拽移动、颜色标识、折叠展开；
- **第二级（会话文件夹）**：每个工作区内的会话按自定义文件夹归类，支持嵌套文件夹、拖拽移动、折叠展开。

替代"装两个插件"的方案（`dsh-workspace-hub` + `dsh-session-categories`），一个插件同时实现两级功能，无冗余。

## 功能

### 工作区分组（第一级）

- 新建 / 重命名 / 删除分组（带颜色标识，自动分配配色）；
- 拖拽工作区进 / 出分组；拖拽工作区在分组内排序；
- 拖拽分组卡片调整分组顺序；
- 全部分组一键展开 / 折叠；
- 删除分组时，其中工作区变为「未分组」，**工作区本身及其会话不删除**；
- 未分组工作区单独归入「未分组」卡片。

### 会话文件夹（第二级）

- 每个工作区独立的文件夹体系，支持**嵌套子文件夹**；
- 拖拽会话进 / 出文件夹；拖拽会话在文件夹内排序；跨文件夹拖拽自动移动；
- 新建 / 重命名 / 删除文件夹（删除时会话变为「未分类」，**会话不删除**）；
- 文件夹内直接「新建会话」（自动归入该文件夹）与「新建子文件夹」；
- 未分类会话直接列在文件夹之后，不再单独占一个分区标题。

### 会话行

- **状态点**：运行中（蓝·脉动）/ 已完成（绿）/ 空闲（灰），实时更新；
- 无标题会话智能回退：优先显示首条提问文本，其次「未命名 · 最近活动时间」，不再是千篇一律的工作区名；
- ⋯ 菜单：移动到文件夹（含嵌套树）、重命名、分叉（子会话**继承源会话的文件夹**）、归档。

### 保留的原生操作

- 打开 / 重命名 / 分叉 / 归档会话；
- 新建会话（顶部 / 工作区行 / 文件夹行）；
- 添加 / 重命名 / 删除工作区；
- 标题 + 消息全文搜索（搜索时隐藏分组视图，按标题 / 消息分组展示结果）。

## 安装

```bash
# 从 GitHub 安装（推荐，发布渠道）
dsh plugin --profile web add https://github.com/<your-github-username>/dsh-session-organizer/archive/refs/heads/main.tar.gz

# 本地开发安装（link 方式：改代码即时生效，重启 dsh web 加载）
dsh plugin --profile web add link:<插件绝对路径>
```

安装后**重启 dsh web 服务**并刷新页面，侧边栏即变为分组视图。

## 消息全文搜索的前提

标题搜索开箱即用；**消息全文搜索**依赖 host 侧的会话检索后端（`@deepseek-ai/dsh-session-query-sqlite`），DSH 组合默认 `openAt: never`（关闭）。开启方式：在 profile 的 `cordis.patch.yml` 中覆盖：

```yaml
- id: session-query-sqlite
  config:
    path: 'C:/Users/<你>/.dsh/session-search.db'   # 持久化索引路径（POSIX 同理）
    openAt: first-search
```

未开启时消息搜索会显示失败提示，标题搜索不受影响。

## 数据与持久化

- 分组与文件夹配置保存在 **localStorage**（快速渲染）+ **host 磁盘**（`~/.dsh/dshorg-groups.json`、`~/.dsh/dshorg-session-folders.json`，机器级可靠）；
- 换浏览器 / 清缓存 / 重启 dsh web 后配置不丢；
- 工作区被删除 → 自动清理其分组归属与文件夹定义；会话被归档 / 删除 → 自动清理对应文件夹分配；
- 清理效应带就绪护栏：工作区列表未加载完成时绝不清数据（远程首连等慢加载场景安全）。

## 使用提示

1. 顶部按钮：`会话`（新建）、`工作区`（添加）、`分组`（新建分组）；
2. **工作区行**右侧 `⋯` 菜单：移动到分组（列出所有分组 + 未分组）、新建会话、新建文件夹、重命名、删除；
3. **文件夹行**悬停操作：新建会话（自动归入）、新建子文件夹、重命名、删除；
4. **会话行**右侧 `⋯` 菜单：移动到文件夹、重命名、分叉、归档；
5. 工作区名、文件夹名、会话名**完整显示**（自动换行不截断）；
6. 整行可点击：悬停显示点击手型，按下拖拽时切换为抓取手型。

## 结构

```
dsh-session-organizer/
├── package.json        # 插件清单（host + client 双面声明）
├── cordis.patch.yml    # bundle 补丁：插入插件行
├── lib/
│   ├── index.js        # host 半：/api/dshorg/* 磁盘持久化路由（loopback 围栏）
│   └── client.js       # 浏览器半：替换 sidebar.workspaces 槽位（priority -100）
├── LICENSE
└── README.md
```

## 技术说明

- 采用 `dsh-workspace-hub` 的自包含模式：client 为 `window.__ModuleLoader__.load` 手递 bundle（仅依赖 `react`），host 为 ESM 插件（仅依赖 `node:fs` / `node:path`），无构建工具链、无第三方运行时依赖；
- 通过 `ctx.slots.inject('sidebar.workspaces', …)` + `priority: -100` 顶替内置工作区浏览器（DSH 侧边栏会话列表没有独立的可注入钩子，只能整体替换浏览区域）；
- 数据读取：`useWorkspaces` / `useSessions` 选择器 hook；操作：`ctx.get('workspaces')` / `ctx.get('sessions')` 服务；
- 点击与拖拽互不干扰：行内点击改用 mousedown/mouseup 位移判定（≤4px 视为点击），避免 draggable 行吞掉 click；
- 拖拽使用独立 MIME 命名空间 `application/x-dshorg`，避免与其他插件冲突；
- 许可证 MIT；参考实现 `dsh-workspace-hub`（Apache-2.0）、`dsh-session-categories`（MIT）。

## 兼容性与已知限制

- 针对 **DSH 0.1.5-rc.1（web profile）** 的槽位 / 服务 API 开发与测试，DSH 升级后如侧边栏槽位 / 服务 API 变动需同步适配；
- 与同样替换 `sidebar.workspaces` 槽位的插件（如 `dsh-workspace-hub`、`dsh-session-categories`）**互斥**，请勿同时安装；
- 消息全文搜索依赖 host 侧检索后端（见上文「消息全文搜索的前提」）。

## License

[MIT](./LICENSE)

// dsh-session-organizer — 浏览器半。
// ModuleLoader handoff bundle：注册逻辑在 factory 内部执行。
// 功能：两级分类侧边栏 —— 第一级工作区分组，第二级工作区内会话文件夹。
window.__ModuleLoader__.load({
  id: 'dsh-session-organizer',
  factory: (require) => {
    'use strict'
    const React = require('react')

    // ==================== 常量 ====================

    /** host RPC 前缀（HTTP 路由去掉该前缀）。 */
    const HOST_PREFIX = 'dshorg-'
    /** 工作区分组 localStorage 键。 */
    const GROUPS_KEY = 'dsh.dshorg.groups.v1'
    /** 会话文件夹 localStorage 键。 */
    const FOLDERS_KEY = 'dsh.dshorg.folders.v1'
    /** 拖拽 MIME 命名空间（独立，避免与原生/其他插件冲突）。 */
    const MIME = 'application/x-dshorg'
    /** 分组配色（循环分配，仅存储于数据，不再显示）。 */
    const GROUP_COLORS = ['#7aa2f7', '#9ece6a', '#e0af68', '#bb9af7', '#f7768e', '#2ac3de', '#73daca', '#ff9e64']

    // ---- 图标（SVG path）----
    const IC_CHEVRON = 'M6 9l6 6 6-6'
    const IC_PLUS = 'M12 5v14M5 12h14'
    const IC_CLOSE = 'M6 6l12 12M18 6L6 18'
    const IC_CHECK = 'M4 12l5 5L20 6'
    const IC_PENCIL = 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'
    const IC_TRASH = 'M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6'
    const IC_FOLDER = 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z'
    const IC_FORK = 'M7 3v9a3 3 0 0 0 3 3h7M14 11l3 4-3 4'
    const IC_ARCHIVE = 'M3 5h18v4H3zM5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4'
    const IC_SEARCH = 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3'
    const IC_SESSION = 'M21 12a9 9 0 1 1-9-9M21 3l-9 9M15 3h6v6'
    const IC_MOVE = 'M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4'
    const IC_UNFOLD = 'M7 13l5 5 5-5M7 6l5 5 5-5'
    const IC_FOLD = 'M7 11l5-5 5 5M7 18l5-5 5 5'
    const IC_NEWFOLDER = 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z M12 10v6M9 13h6'
    const IC_MORE = 'M5 12h.01M12 12h.01M19 12h.01'

    // ---- 样式表（跟随 DSH 主题变量）----
    const CSS = `
.dsorg-root{display:flex;flex-direction:column;height:100%;min-height:0;font-size:12px;line-height:1.45;color:var(--dsw-alias-label-primary,#e7e9ee);font-family:"Segoe UI Variable Text","Segoe UI",-apple-system,"PingFang SC","Microsoft YaHei UI",sans-serif}
.dsorg-head{display:flex;align-items:center;justify-content:space-between;gap:6px 8px;padding:9px 12px 7px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(148,163,184,.12));flex-wrap:wrap}
.dsorg-title{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;letter-spacing:.02em;color:var(--dsw-alias-label-primary,#e7e9ee);flex:none}
.dsorg-title-chip{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:6px;background:var(--dsw-alias-button-primary-dimmed,rgba(110,168,255,.14));color:var(--dsw-alias-brand-primary,#6ea8ff)}
.dsorg-head-actions{display:flex;align-items:center;gap:2px;margin-left:auto;min-width:0}
.dsorg-hbtn{display:inline-flex;align-items:center;gap:4px;padding:4px 9px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,#b8bfcc);cursor:pointer;font-size:12px;font-family:inherit;white-space:nowrap;transition:background .12s ease,color .12s ease,border-color .12s ease}
.dsorg-hbtn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(148,163,184,.1));color:var(--dsw-alias-label-primary,#e7e9ee)}
.dsorg-hbtn-primary{background:var(--dsw-alias-button-primary-dimmed,rgba(110,168,255,.14));color:var(--dsw-alias-brand-primary,#6ea8ff);border-color:rgba(110,168,255,.2)}
.dsorg-hbtn-primary:hover{background:var(--dsw-alias-button-primary-hover,rgba(110,168,255,.24))}
.dsorg-hbtn-on{background:var(--dsw-alias-button-primary-hover,rgba(110,168,255,.24));color:var(--dsw-alias-brand-primary,#6ea8ff);border-color:rgba(110,168,255,.35)}
.dsorg-hbtn-ic{display:inline-flex;align-items:center;justify-content:center;width:28px;height:26px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,#b8bfcc);cursor:pointer;padding:0;transition:background .12s ease,color .12s ease,border-color .12s ease}
.dsorg-hbtn-ic:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(148,163,184,.1));color:var(--dsw-alias-label-primary,#e7e9ee)}
.dsorg-hbtn-ic.on{color:var(--dsw-alias-brand-primary,#6ea8ff);background:var(--dsw-alias-button-primary-dimmed,rgba(110,168,255,.14))}
.dsorg-srch{display:flex;align-items:center;gap:6px;margin:8px 12px 2px;padding:0 9px;border:1px solid var(--dsw-alias-border-l1,rgba(148,163,184,.18));border-radius:8px;background:var(--dsw-alias-bg-layer-1,rgba(148,163,184,.07));color:var(--dsw-alias-label-tertiary,#9aa3b2);transition:border-color .2s ease,box-shadow .2s ease,background .2s ease}
.dsorg-srch:focus-within{border-color:rgba(110,168,255,.5);background:var(--dsw-alias-bg-layer-1,rgba(148,163,184,.09));box-shadow:0 0 0 2px rgba(110,168,255,.07)}
.dsorg-srch input{flex:1;min-width:0;padding:5px 0;border:none;background:transparent;color:inherit;font-size:11.5px;font-family:inherit;outline:none}
.dsorg-srch input::placeholder{color:var(--dsw-alias-label-tertiary,#9aa3b2)}
.dsorg-clear{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border:none;border-radius:4px;background:transparent;color:var(--dsw-alias-label-tertiary,#9aa3b2);cursor:pointer;padding:0}
.dsorg-clear:hover{color:var(--dsw-alias-label-primary,#e7e9ee);background:var(--dsw-alias-interactive-bg-hover,rgba(148,163,184,.12))}
.dsorg-tree{flex:1;overflow-y:auto;padding:6px 10px 16px}
.dsorg-fcard{position:relative;background:var(--dsw-alias-bg-layer-1,rgba(148,163,184,.05));border:1px solid var(--dsw-alias-border-l1,rgba(148,163,184,.12));border-radius:10px;padding:3px;margin-bottom:8px;animation:dsorg-rise .28s ease both;transition:border-color .15s ease,background .15s ease;cursor:grab}
.dsorg-fcard:active{cursor:grabbing}
.dsorg-fcard:hover{border-color:var(--dsw-alias-border-l2,rgba(148,163,184,.26))}
.dsorg-fcard.dsorg-dragging{opacity:.45}
@keyframes dsorg-rise{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.dsorg-fhead{position:relative;display:flex;align-items:center;gap:7px;padding:6px 8px;border-radius:8px;cursor:pointer;user-select:none;min-height:30px;border:1px dashed transparent;transition:background .12s ease}
.dsorg-fhead:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(148,163,184,.08))}
.dsorg-fhead.dsorg-drop{border-color:var(--dsw-alias-brand-primary,#6ea8ff);background:var(--dsw-alias-button-primary-dimmed,rgba(110,168,255,.14))}
.dsorg-chev{transition:transform .18s ease;color:var(--dsw-alias-label-tertiary,#9aa3b2);flex:none}
.dsorg-chev.closed{transform:rotate(-90deg)}
.dsorg-fname{font-weight:650;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12.5px}
.dsorg-facts{visibility:hidden;opacity:0;display:flex;align-items:center;gap:1px;transition:opacity .12s ease}
.dsorg-fhead:hover .dsorg-facts{visibility:visible;opacity:1}
.dsorg-wlist{padding:2px 2px 4px 8px}
.dsorg-ws{position:relative;border-radius:8px;cursor:pointer}
.dsorg-ws:active{cursor:grabbing}
.dsorg-ws-target{background:var(--dsw-alias-interactive-bg-active,rgba(110,168,255,.1))}
.dsorg-whead{display:flex;align-items:center;gap:7px;padding:6px 8px;border-radius:8px;cursor:pointer;user-select:none;transition:background .12s ease}
.dsorg-whead:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(148,163,184,.08))}
.dsorg-wmid{flex:1;min-width:0}
.dsorg-wtitle{font-weight:600;overflow-wrap:anywhere;word-break:break-all;font-size:12.5px;line-height:1.35}
.dsorg-wacts{display:flex;align-items:center;gap:1px;flex:none}
.dsorg-ws-hovered{background:var(--dsw-alias-interactive-bg-hover,rgba(148,163,184,.08))}
.dsorg-slist{margin:3px 0 6px 16px;padding:4px 0 4px 10px}
.dsorg-flist{margin:3px 0 4px 14px;padding:2px 0 2px 6px}
.dsorg-frow{position:relative;display:flex;align-items:center;gap:6px;padding:4px 7px;border-radius:8px;cursor:pointer;margin:2px 0;transition:background .12s ease}
.dsorg-frow:active{cursor:grabbing}
.dsorg-frow:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(148,163,184,.08))}
.dsorg-frow.dsorg-drop{border:1px dashed var(--dsw-alias-brand-primary,#6ea8ff);background:var(--dsw-alias-button-primary-dimmed,rgba(110,168,255,.14))}
.dsorg-frow-target{background:var(--dsw-alias-interactive-bg-active,rgba(110,168,255,.1))}
.dsorg-frow-name{flex:1;min-width:0;overflow-wrap:anywhere;word-break:break-all;font-size:12px;font-weight:600}
.dsorg-facts2{visibility:hidden;opacity:0;display:flex;align-items:center;gap:1px;transition:opacity .12s ease}
.dsorg-frow:hover .dsorg-facts2{visibility:visible;opacity:1}
.dsorg-sess{position:relative;display:flex;flex-direction:column;gap:4px;padding:8px 10px;border-radius:8px;cursor:pointer;margin:4px 0;transition:background .12s ease}
.dsorg-sess:active{cursor:grabbing}
.dsorg-sess:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(148,163,184,.08))}
.dsorg-sess.current{background:var(--dsw-alias-interactive-bg-active,rgba(110,168,255,.13))}
.dsorg-sess-row1{display:flex;align-items:center;gap:7px;min-width:0;padding-right:52px}
.dsorg-sess-title{flex:1;min-width:0;overflow-wrap:anywhere;word-break:break-all;font-size:13px;line-height:1.35}
.dsorg-st{width:7px;height:7px;border-radius:50%;flex:none}
.dsorg-st.run{background:#7aa2f7;animation:dsorg-st-pulse 1.6s ease-in-out infinite}
.dsorg-st.done{background:#9ece6a}
.dsorg-st.idle{background:var(--dsw-alias-label-tertiary,#9aa3b2);opacity:.55}
@keyframes dsorg-st-pulse{0%,100%{opacity:1}50%{opacity:.35}}
.dsorg-srow{display:flex;align-items:center;gap:7px;min-width:0}
.dsorg-sacts{position:absolute;top:5px;right:5px;display:flex;align-items:center;gap:1px;background:inherit}
.dsorg-ic{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border:none;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary,#b8bfcc);cursor:pointer;padding:0;transition:background .12s ease,color .12s ease}
.dsorg-ic:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(148,163,184,.14));color:var(--dsw-alias-label-primary,#e7e9ee)}
.dsorg-ic.danger:hover{color:var(--dsw-alias-state-error-primary,#ff7a7a);background:rgba(255,122,122,.12)}
.dsorg-ic.ok:hover{color:var(--dsw-alias-state-success-primary,#4ade80);background:rgba(74,222,128,.12)}
.dsorg-sec{display:flex;align-items:center;gap:8px;padding:8px 4px 4px;font-size:10px;color:var(--dsw-alias-label-tertiary,#9aa3b2);font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.dsorg-sec::after{content:'';flex:1;height:1px;background:var(--dsw-alias-border-l1,rgba(148,163,184,.14))}
.dsorg-empty{padding:28px 16px;text-align:center;color:var(--dsw-alias-label-tertiary,#9aa3b2);font-size:11.5px;display:flex;flex-direction:column;align-items:center;gap:8px}
.dsorg-empty-ic{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-button-primary-dimmed,rgba(110,168,255,.12));color:var(--dsw-alias-brand-primary,#6ea8ff)}
.dsorg-snip{font-size:10.5px;color:var(--dsw-alias-label-secondary,#b8bfcc);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px;flex:none}
.dsorg-rail{display:flex;flex-direction:column;align-items:center;gap:5px;padding:10px 5px;overflow-y:auto}
.dsorg-rail-btn{position:relative;width:30px;height:30px;border:none;border-radius:9px;background:transparent;color:var(--dsw-alias-label-secondary,#b8bfcc);cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;transition:background .12s ease,transform .12s ease}
.dsorg-rail-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(148,163,184,.12));color:var(--dsw-alias-label-primary,#e7e9ee);transform:translateY(-1px)}
.dsorg-inline{flex:1;min-width:0;font-size:11.5px;font-family:inherit;color:inherit;background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.15));border:1px solid rgba(110,168,255,.4);border-radius:7px;padding:3px 7px;outline:none;box-shadow:0 0 0 2px rgba(110,168,255,.06);transition:border-color .2s ease,box-shadow .2s ease,background .2s ease}
.dsorg-newrow{display:flex;align-items:center;gap:4px;padding:4px 6px;border-radius:9px;margin:2px 0 6px;background:var(--dsw-alias-button-primary-dimmed,rgba(110,168,255,.1));border:1px dashed var(--dsw-alias-border-l2,rgba(148,163,184,.35));color:var(--dsw-alias-brand-primary,#6ea8ff);animation:dsorg-rise .22s ease both}
.dsorg-menu{position:fixed;right:auto;top:auto;z-index:2147482995;min-width:132px;max-width:220px;max-height:min(420px,70vh);overflow-y:auto;background:var(--dsw-alias-bg-overlay,#1c1d21);border:1px solid var(--dsw-alias-border-l2,rgba(148,163,184,.3));border-radius:9px;padding:4px;box-shadow:0 8px 24px rgba(0,0,0,.35);animation:dsorg-rise .15s ease both}
.dsorg-menu-item{display:flex;align-items:center;gap:7px;padding:5px 8px;border-radius:6px;cursor:pointer;font-size:11.5px;color:var(--dsw-alias-label-secondary,#b8bfcc);white-space:nowrap}
.dsorg-menu-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(148,163,184,.12));color:var(--dsw-alias-label-primary,#e7e9ee)}
.dsorg-menu-item.cur{color:var(--dsw-alias-brand-primary,#6ea8ff)}
.dsorg-menu-sec{display:flex;align-items:center;gap:8px;padding:6px 8px 3px;font-size:10px;color:var(--dsw-alias-label-tertiary,#9aa3b2);font-weight:700;letter-spacing:.06em}
.dsorg-menu-sep{height:1px;margin:4px 6px;background:var(--dsw-alias-border-l1,rgba(148,163,184,.14))}
.dsorg-menu-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsorg-menu-check{color:var(--dsw-alias-brand-primary,#6ea8ff);flex:none}
.dsorg-floatline{position:fixed;height:2px;border-radius:2px;background:var(--dsw-alias-brand-primary,#6ea8ff);box-shadow:0 0 8px rgba(110,168,255,.6);pointer-events:none;z-index:2147483000;transition:top .05s linear}
button:focus-visible,input:focus-visible{outline:1px solid rgba(110,168,255,.55);outline-offset:1px;border-radius:6px}
`

    // ==================== 工具函数 ====================

    /** 生成短唯一 id。 */
    function uid() {
      return 'd' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)
    }

    /** host RPC：POST /api/dshorg/<method>，返回 JSON。 */
    function hostCall(method, payload) {
      if (typeof fetch === 'undefined') return Promise.reject(new Error('dshorg: fetch 不可用'))
      const path = method.indexOf(HOST_PREFIX) === 0 ? method.slice(HOST_PREFIX.length) : method
      return fetch('/api/dshorg/' + path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload || {}),
      }).then((res) => {
        if (!res.ok) throw new Error('dshorg: HTTP ' + res.status)
        return res.json()
      })
    }

    // ---- 工作区分组数据 ----
    function baseGroups() {
      return { groups: [], assign: {}, order: {} }
    }
    function loadGroupsLocal() {
      try {
        if (typeof localStorage === 'undefined') return baseGroups()
        const raw = localStorage.getItem(GROUPS_KEY)
        if (!raw) return baseGroups()
        const p = JSON.parse(raw)
        if (!p || typeof p !== 'object') return baseGroups()
        const groups = Array.isArray(p.groups)
          ? p.groups.filter((g) => g && typeof g.id === 'string' && typeof g.name === 'string')
            .map((g) => ({ id: g.id, name: g.name, color: typeof g.color === 'string' ? g.color : GROUP_COLORS[0] }))
          : []
        const assign = p.assign && typeof p.assign === 'object' && !Array.isArray(p.assign) ? p.assign : {}
        const order = p.order && typeof p.order === 'object' && !Array.isArray(p.order) ? p.order : {}
        return { groups, assign, order }
      } catch { return baseGroups() }
    }

    // ---- 会话文件夹数据 ----
    function baseFolders() {
      return { folders: [], assign: {}, order: {} }
    }
    function loadFoldersLocal() {
      try {
        if (typeof localStorage === 'undefined') return baseFolders()
        const raw = localStorage.getItem(FOLDERS_KEY)
        if (!raw) return baseFolders()
        const p = JSON.parse(raw)
        if (!p || typeof p !== 'object') return baseFolders()
        const folders = Array.isArray(p.folders)
          ? p.folders.filter((f) => f && typeof f.id === 'string' && typeof f.workspaceId === 'string' && typeof f.name === 'string')
            .map((f) => ({ id: f.id, workspaceId: f.workspaceId, name: f.name, parentId: typeof f.parentId === 'string' ? f.parentId : null }))
          : []
        const assign = p.assign && typeof p.assign === 'object' && !Array.isArray(p.assign) ? p.assign : {}
        const order = p.order && typeof p.order === 'object' && !Array.isArray(p.order) ? p.order : {}
        return { folders, assign, order }
      } catch { return baseFolders() }
    }

    /** 循环取一个尽量少用的分组颜色。 */
    function nextColor(groups) {
      const counts = {}
      groups.forEach((g) => { counts[g.color] = (counts[g.color] || 0) + 1 })
      let best = GROUP_COLORS[0]
      let bestCount = Infinity
      GROUP_COLORS.forEach((c) => {
        const n = counts[c] || 0
        if (n < bestCount) { bestCount = n; best = c }
      })
      return best
    }

    // ==================== 小组件 ====================

    /** 图标。 */
    function Icon({ d, size, className }) {
      return React.createElement('svg', { className: className || '', width: size || 13, height: size || 13, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        React.createElement('path', { d }),
      )
    }

    /** 图标按钮。 */
    function IconBtn({ title, icon, onClick, danger, ok, className }) {
      return React.createElement('button', {
        type: 'button',
        className: 'dsorg-ic' + (danger ? ' danger' : '') + (ok ? ' ok' : '') + (className ? ' ' + className : ''),
        title: title,
        'aria-label': title,
        onClick: (e) => { e.stopPropagation(); if (onClick) onClick(e) },
      }, React.createElement(Icon, { d: icon, size: 12 }))
    }

    /** 行内编辑器（回车提交，Esc/失焦取消）。 */
    function InlineEditor({ initial, placeholder, onCommit, onCancel }) {
      const commit = (raw) => {
        const t = (raw || '').trim()
        if (!t) { onCancel(); return }
        onCommit(t)
      }
      return React.createElement('input', {
        type: 'text',
        className: 'dsorg-inline',
        defaultValue: initial,
        placeholder: placeholder || '',
        autoFocus: true,
        spellCheck: false,
        onClick: (e) => e.stopPropagation(),
        onKeyDown: (e) => {
          e.stopPropagation()
          if (e.key === 'Enter') commit(e.target.value)
          else if (e.key === 'Escape') onCancel()
        },
        onBlur: (e) => commit(e.target.value),
      })
    }

    // ==================== 主浏览器组件 ====================

    /**
     * 侧边栏工作区/会话浏览器（替换默认浏览器）。
     * 两级分类：第一级工作区分组，第二级工作区内会话文件夹。
     */
    function Browser({ wide, expandSidebar, useSessions, useWorkspaces, workspacesApi, sessionsApi, getDirectoryPicker, layoutApi }) {
      const items = (useWorkspaces ? useWorkspaces((s) => s.items) : []) || []
      const archivedIds = (useWorkspaces ? useWorkspaces((s) => s.archivedSessionIds) : []) || []
      const wsPhase = useWorkspaces ? useWorkspaces((s) => s.phase) : undefined
      const sState = useSessions ? useSessions((s) => s) : { ids: [], byId: {}, current: undefined, phase: undefined }
      const sessions = (sState && sState.byId) || {}
      const current = sState && sState.current
      // 已归档会话集合（提前定义，供搜索/列表/计数共用）
      const archivedSet = {}
      archivedIds.forEach((id) => { archivedSet[id] = true })
      // 打开会话：sessions.open + 切回对话面板（对齐原生 openSession 行为）
      const openSession = (id) => {
        if (sessionsApi && typeof sessionsApi.open === 'function') sessionsApi.open(id)
        if (layoutApi && typeof layoutApi.selectPanel === 'function') layoutApi.selectPanel(null)
      }

      // ---- 状态 ----
      const [groupsData, setGroupsData] = React.useState(loadGroupsLocal)
      const [foldersData, setFoldersData] = React.useState(loadFoldersLocal)
      const [groupsHydrated, setGroupsHydrated] = React.useState(false)
      const [foldersHydrated, setFoldersHydrated] = React.useState(false)
      const [expGroups, setExpGroups] = React.useState({})
      const [expWorkspaces, setExpWorkspaces] = React.useState({})
      const [expFolders, setExpFolders] = React.useState({})
      const [query, setQuery] = React.useState('')
      const [remote, setRemote] = React.useState({ status: 'idle', items: [], hasMore: false })
      const [editing, setEditing] = React.useState(null)
      const [menuFor, setMenuFor] = React.useState(null)
      const [menuPos, setMenuPos] = React.useState(null)
      const [dragState, setDragState] = React.useState(null)
      const [dropMarker, setDropMarker] = React.useState(null)
      const [dropLine, setDropLine] = React.useState(null)
      const dragRef = React.useState({ current: null, lastOver: null })[0]

      // ---- 持久化（localStorage + host 磁盘）----
      const saveGroups = (d) => {
        try { if (typeof localStorage !== 'undefined') localStorage.setItem(GROUPS_KEY, JSON.stringify(d)) } catch (err) { console.error('dshorg: 本地保存失败', err) }
        if (typeof fetch !== 'undefined' && groupsHydrated) {
          hostCall('dshorg-groups', { save: true, data: d }).catch((err) => console.error('dshorg: 分组持久化失败', err))
        }
      }
      const saveFolders = (d) => {
        try { if (typeof localStorage !== 'undefined') localStorage.setItem(FOLDERS_KEY, JSON.stringify(d)) } catch (err) { console.error('dshorg: 本地保存失败', err) }
        if (typeof fetch !== 'undefined' && foldersHydrated) {
          hostCall('dshorg-session-folders', { save: true, data: d }).catch((err) => console.error('dshorg: 文件夹持久化失败', err))
        }
      }

      // ---- 从 host 磁盘水合（机器级源），未完成前不覆盖 ----
      React.useEffect(() => {
        if (typeof fetch === 'undefined' || groupsHydrated) return
        let alive = true
        hostCall('dshorg-groups', {}).then((res) => {
          if (!alive) return
          if (res && typeof res === 'object') {
            const merged = loadGroupsLocal()
            if (Array.isArray(res.groups)) merged.groups = res.groups
            if (res.assign && typeof res.assign === 'object') merged.assign = res.assign
            if (res.order && typeof res.order === 'object') merged.order = res.order
            setGroupsData(merged)
          }
          setGroupsHydrated(true)
        }).catch(() => setGroupsHydrated(true))
        return () => { alive = false }
      }, [groupsHydrated])

      React.useEffect(() => {
        if (typeof fetch === 'undefined' || foldersHydrated) return
        let alive = true
        hostCall('dshorg-session-folders', {}).then((res) => {
          if (!alive) return
          if (res && typeof res === 'object') {
            const merged = loadFoldersLocal()
            if (Array.isArray(res.folders)) merged.folders = res.folders
            if (res.assign && typeof res.assign === 'object') merged.assign = res.assign
            if (res.order && typeof res.order === 'object') merged.order = res.order
            setFoldersData(merged)
          }
          setFoldersHydrated(true)
        }).catch(() => setFoldersHydrated(true))
        return () => { alive = false }
      }, [foldersHydrated])

      // ---- 跨标签页同步 ----
      React.useEffect(() => {
        if (typeof window === 'undefined') return
        const onStorage = (e) => {
          if (e.key === GROUPS_KEY) setGroupsData(loadGroupsLocal())
          if (e.key === FOLDERS_KEY) setFoldersData(loadFoldersLocal())
        }
        window.addEventListener('storage', onStorage)
        return () => window.removeEventListener('storage', onStorage)
      }, [])

      // ---- 数据清理（prune）：删除不存在的工作区/会话的分配与文件夹 ----
      React.useEffect(() => {
        // 工作区列表未加载/未就绪时绝不清数据（防止远程首连等慢加载场景把全部分配误清空）
        if (items.length === 0) return
        if (wsPhase !== undefined && wsPhase !== 'ready') return
        const knownWs = {}
        items.forEach((w) => { knownWs[w.workspaceId] = true })
        let gChanged = false
        const gAssign = {}
        Object.keys(groupsData.assign).forEach((k) => {
          if (knownWs[k]) gAssign[k] = groupsData.assign[k]
          else gChanged = true
        })
        const gOrder = {}
        Object.keys(groupsData.order || {}).forEach((key) => {
          const kept = (groupsData.order[key] || []).filter((id) => knownWs[id])
          if (kept.length > 0) gOrder[key] = kept
          if (kept.length !== (groupsData.order[key] || []).length) gChanged = true
        })
        if (gChanged) {
          const next = { groups: groupsData.groups, assign: gAssign, order: gOrder }
          saveGroups(next)
          setGroupsData(next)
        }
      }, [items, groupsData, wsPhase])

      React.useEffect(() => {
        // 工作区列表未加载/未就绪时绝不清数据（防止远程首连等慢加载场景把全部文件夹误清空）
        if (items.length === 0) return
        if (wsPhase !== undefined && wsPhase !== 'ready') return
        const knownWs = {}
        items.forEach((w) => { knownWs[w.workspaceId] = true })
        // 已归档会话集合
        const archivedSet = {}
        archivedIds.forEach((id) => { archivedSet[id] = true })
        // 有效会话集合（工作区账本会话 + 会话存储已知会话，均排除已归档）。
        // 会话存储在 create/fork 返回前已同步包含新会话，但工作区账本（items）要晚一拍——
        // 把存储已知也视为有效，"刚创建/刚分叉立即归类"就不会被本清理效应误删。
        const knownSessions = {}
        items.forEach((w) => w.sessionIds.forEach((id) => { if (!archivedSet[id]) knownSessions[id] = true }))
        Object.keys(sessions).forEach((id) => { if (!archivedSet[id]) knownSessions[id] = true })
        let fChanged = false
        let folders = foldersData.folders.filter((f) => {
          if (!knownWs[f.workspaceId]) { fChanged = true; return false }
          return true
        })
        const folderIds = new Set(folders.map((f) => f.id))
        // 清理孤儿子文件夹（parentId 指向不存在的文件夹）
        let orphaned = true
        let guard = 0
        while (orphaned && guard < 20) {
          orphaned = false
          folders = folders.filter((f) => {
            if (f.parentId !== null && !folderIds.has(f.parentId)) { fChanged = true; orphaned = true; return false }
            return true
          })
          folderIds.clear()
          folders.forEach((f) => folderIds.add(f.id))
          guard++
        }
        // 删除指向不存在文件夹的分配
        const assign = {}
        Object.keys(foldersData.assign).forEach((k) => {
          const fid = foldersData.assign[k]
          if (knownSessions[k] && folderIds.has(fid)) assign[k] = fid
          else fChanged = true
        })
        const order = {}
        Object.keys(foldersData.order || {}).forEach((key) => {
          if (!folderIds.has(key)) { fChanged = true; return }
          const kept = (foldersData.order[key] || []).filter((id) => knownSessions[id])
          if (kept.length > 0) order[key] = kept
          if (kept.length !== (foldersData.order[key] || []).length) fChanged = true
        })
        if (fChanged) {
          const next = { folders, assign, order }
          saveFolders(next)
          setFoldersData(next)
        }
      }, [items, archivedIds, foldersData, wsPhase])

      // ---- 会话文件夹内未分类会话：为每个工作区计算 ----
      // 计算逻辑在渲染时完成，无需状态。

      // ---- 当前会话自动展开所在分组/工作区/文件夹 ----
      React.useEffect(() => {
        if (!current) return
        const ws = items.find((w) => w.sessionIds.indexOf(current) !== -1)
        if (!ws) return
        setExpWorkspaces((prev) => (prev[ws.workspaceId] ? prev : Object.assign({}, prev, { [ws.workspaceId]: true })))
        const gid = groupsData.assign[ws.workspaceId]
        if (gid && groupsData.groups.some((g) => g.id === gid)) {
          setExpGroups((prev) => (prev[gid] ? prev : Object.assign({}, prev, { [gid]: true })))
        }
        const fid = foldersData.assign[current]
        if (fid) {
          // 展开该文件夹及其祖先
          setExpFolders((prev) => {
            const next = Object.assign({}, prev)
            let cur = foldersData.folders.find((f) => f.id === fid)
            let guard = 0
            while (cur && guard < 20) {
              next[cur.id] = true
              cur = cur.parentId ? foldersData.folders.find((f) => f.id === cur.parentId) : null
              guard++
            }
            return next
          })
        }
      }, [current, items, groupsData, foldersData])

      // ---- 菜单：打开（记录位置）与关闭 ----
      const openMenu = (menu) => {
        setMenuFor(menu)
        setMenuPos({ x: menu.x, y: menu.y })
      }
      React.useEffect(() => {
        if (!menuFor) return
        if (typeof window === 'undefined' || typeof document === 'undefined') return
        const close = (e) => {
          const t = e.target
          if (t && typeof t.closest === 'function') {
            if (t.closest('.dsorg-menu')) return
            if (t.closest('.dsorg-mbtn')) return
          }
          setMenuFor(null); setMenuPos(null)
        }
        const onKey = (e) => { if (e.key === 'Escape') { setMenuFor(null); setMenuPos(null) } }
        const onScroll = () => { setMenuFor(null); setMenuPos(null) }
        document.addEventListener('mousedown', close)
        document.addEventListener('keydown', onKey)
        document.addEventListener('scroll', onScroll, true)
        return () => {
          document.removeEventListener('mousedown', close)
          document.removeEventListener('keydown', onKey)
          document.removeEventListener('scroll', onScroll, true)
        }
      }, [menuFor])

      // ---- 搜索：标题匹配 + 消息匹配 ----
      const q = query.trim().toLowerCase()
      const titleMatches = []
      if (q) {
        Object.keys(sessions).forEach((id) => {
          const s = sessions[id]
          // 不搜索已归档会话
          if (!archivedSet[id] && s && s.displayTitle && String(s.displayTitle).toLowerCase().indexOf(q) !== -1) titleMatches.push(id)
        })
      }
      React.useEffect(() => {
        if (!q) {
          setRemote({ status: 'idle', items: [], hasMore: false })
          return
        }
        if (!sessionsApi || typeof sessionsApi.search !== 'function') return
        const controller = new AbortController()
        setRemote({ status: 'loading', items: [], hasMore: false })
        let timer = null
        if (typeof window !== 'undefined') {
          timer = window.setTimeout(() => {
            sessionsApi.search(q, controller.signal).then((result) => {
              if (controller.signal.aborted) return
              if (result && result.ok) {
                const value = result.value || {}
                setRemote({ status: 'ready', items: value.items || [], hasMore: !!value.hasMore })
              } else {
                console.error('dshorg: 消息搜索失败', result && result.error && result.error.message)
                setRemote({ status: 'error', items: [], hasMore: false })
              }
            }).catch((err) => {
              if (!controller.signal.aborted) {
                console.error('dshorg: 消息搜索异常', err)
                setRemote({ status: 'error', items: [], hasMore: false })
              }
            })
          }, 250)
        }
        return () => {
          if (timer !== null && typeof window !== 'undefined') window.clearTimeout(timer)
          controller.abort()
        }
      }, [q, sessionsApi])

      // ---- 数据更新辅助 ----
      const updateGroups = (fn) => {
        setGroupsData((prev) => {
          const d = { groups: prev.groups.slice(), assign: Object.assign({}, prev.assign), order: Object.assign({}, prev.order || {}) }
          fn(d)
          saveGroups(d)
          return d
        })
      }
      const updateFolders = (fn) => {
        setFoldersData((prev) => {
          const d = { folders: prev.folders.slice(), assign: Object.assign({}, prev.assign), order: Object.assign({}, prev.order || {}) }
          fn(d)
          saveFolders(d)
          return d
        })
      }

      // ---- 拖拽解析 ----
      const parsePayload = (e) => {
        try {
          const raw = e.dataTransfer.getData(MIME) || ''
          const parts = raw.split(':')
          if (parts[0] === 'session' && parts.length >= 3) {
            return { kind: 'session', wsId: parts.slice(1, -1).join(':'), id: parts[parts.length - 1] }
          }
          if ((parts[0] === 'workspace' || parts[0] === 'group' || parts[0] === 'folder') && parts.length >= 2) {
            return { kind: parts[0], id: parts.slice(1).join(':') }
          }
        } catch (err) { /* 忽略 */ }
        return null
      }

      // 拖拽开始：写入载荷
      const onDragStart = (e, payload) => {
        try { e.dataTransfer.setData(MIME, payload) } catch (err) { /* 忽略 */ }
        if (e.dataTransfer && typeof e.dataTransfer.setDragImage === 'function') {
          try { e.dataTransfer.setDragImage(e.currentTarget, 12, 12) } catch (err) { /* 忽略 */ }
        }
        dragRef.current = payload
        setDragState(payload)
      }
      const onDragEnd = () => {
        dragRef.current = null
        dragRef.lastOver = null
        setDragState(null)
        setDropMarker(null)
        setDropLine(null)
      }

      // 点击判定（区分拖拽）：按下→抬起位移 ≤ 4px 才触发。
      // 行是 draggable 的，手抖几像素会被浏览器当成拖拽、吞掉 click（表现为"点了没反应"），
      // 改用 mouseup 判定后，点击与拖拽互不干扰；按钮/输入框内的按压不参与判定。
      const clickRef = React.useState({ current: null })[0]
      const clickNoDrag = (fn) => ({
        onMouseDown: (e) => {
          if (e.button !== 0) { clickRef.current = null; return }
          const t = e.target
          if (t && t.closest && t.closest('button,input,textarea')) { clickRef.current = null; return }
          clickRef.current = { x: e.clientX, y: e.clientY }
        },
        onMouseUp: (e) => {
          const p = clickRef.current
          clickRef.current = null
          if (!p || e.button !== 0) return
          const t = e.target
          if (t && t.closest && t.closest('button,input,textarea')) return
          if (Math.abs(e.clientX - p.x) > 4 || Math.abs(e.clientY - p.y) > 4) return
          e.stopPropagation()
          fn()
        },
      })

      // 拖拽悬停标记
      const markOver = (marker, e, el) => {
        dragRef.lastOver = marker
        setDropMarker(marker)
        const target = el || (e ? e.currentTarget : null)
        if (target && typeof target.getBoundingClientRect === 'function') {
          const rect = target.getBoundingClientRect()
          setDropLine({
            top: marker.half === 'before' ? rect.top : rect.bottom,
            left: rect.left,
            width: rect.width,
          })
        } else if (e && typeof e.clientY === 'number') {
          setDropLine({ top: e.clientY, left: 0, width: 240 })
        }
      }

      // 上/下半判定（偏上视为 before）
      const halfOf = (e, el) => {
        const target = el || e.currentTarget
        if (!target || typeof target.getBoundingClientRect !== 'function') return 'after'
        const rect = target.getBoundingClientRect()
        return e.clientY < rect.top + rect.height * 0.5 ? 'before' : 'after'
      }

      // ---- 分组操作 ----
      const createGroup = (name) => {
        updateGroups((d) => { d.groups.push({ id: uid(), name, color: nextColor(d.groups) }) })
      }
      const renameGroup = (id, name) => {
        updateGroups((d) => { d.groups.forEach((g) => { if (g.id === id) g.name = name }) })
      }
      const deleteGroup = (id) => {
        if (!window.confirm('删除该分组？其中的工作区会变为「未分组」，工作区本身及其目录、会话都不会被删除。')) return
        updateGroups((d) => {
          d.groups = d.groups.filter((g) => g.id !== id)
          Object.keys(d.assign).forEach((k) => { if (d.assign[k] === id) delete d.assign[k] })
          delete d.order[id]
        })
      }
      // 工作区归属分组
      const assignWorkspaceToGroup = (wsId, gid) => {
        updateGroups((d) => {
          if (gid) d.assign[wsId] = gid
          else delete d.assign[wsId]
        })
      }
      // 分组内工作区排序
      const moveWorkspaceInto = (gid, dragId, beforeId) => {
        const key = gid || 'none'
        const current = folderOrderedWs(key).map((w) => w.workspaceId)
        const had = current.indexOf(dragId)
        const rest = current.filter((id) => id !== dragId)
        const at = beforeId == null ? rest.length : rest.indexOf(beforeId)
        if (at === -1) return
        if (had !== -1) {
          if (beforeId == null) { if (had === rest.length) return }
          else if (at === had) return
        }
        const next = rest.slice()
        next.splice(at, 0, dragId)
        updateGroups((d) => {
          d.order[key] = next
          if (gid) d.assign[dragId] = gid
          else delete d.assign[dragId]
        })
      }
      // 分组排序
      const moveGroup = (id, beforeId) => {
        updateGroups((d) => {
          const from = d.groups.findIndex((x) => x.id === id)
          if (from === -1) return
          const list = d.groups.filter((x) => x.id !== id)
          const at = beforeId == null ? list.length : list.findIndex((x) => x.id === beforeId)
          const idx = at === -1 ? list.length : at
          list.splice(idx, 0, d.groups[from])
          d.groups = list
        })
      }

      // ---- 文件夹操作 ----
      const createFolder = (workspaceId, parentId, name) => {
        updateFolders((d) => { d.folders.push({ id: uid(), workspaceId, name, parentId }) })
      }
      const renameFolder = (id, name) => {
        updateFolders((d) => { d.folders.forEach((f) => { if (f.id === id) f.name = name }) })
      }
      const deleteFolder = (id) => {
        if (!window.confirm('删除该文件夹？其中的会话会变为「未分类」，会话本身不会被删除。')) return
        updateFolders((d) => {
          // 递归删除子文件夹
          const doomed = new Set()
          const queue = [id]
          while (queue.length > 0) {
            const cur = queue.shift()
            doomed.add(cur)
            d.folders.forEach((f) => { if (f.parentId === cur && !doomed.has(f.id)) queue.push(f.id) })
          }
          d.folders = d.folders.filter((f) => !doomed.has(f.id))
          Object.keys(d.assign).forEach((k) => { if (doomed.has(d.assign[k])) delete d.assign[k] })
          doomed.forEach((did) => { delete d.order[did] })
        })
      }
      // 会话归属文件夹
      const assignSessionToFolder = (sessionId, fid) => {
        updateFolders((d) => {
          if (fid) d.assign[sessionId] = fid
          else delete d.assign[sessionId]
        })
      }
      // 文件夹内会话排序（fid 为空表示未分类；orderKey 按工作区隔离）
      const moveSessionInto = (fid, wsId, dragId, beforeId) => {
        const orderKey = fid || ('none:' + wsId)
        const current = orderedSessionsIn(fid ? fid : 'none', wsId).map((s) => s.id)
        const had = current.indexOf(dragId)
        const rest = current.filter((id) => id !== dragId)
        const at = beforeId == null ? rest.length : rest.indexOf(beforeId)
        if (at === -1) return
        if (had !== -1) {
          if (beforeId == null) { if (had === rest.length) return }
          else if (at === had) return
        }
        const next = rest.slice()
        next.splice(at, 0, dragId)
        updateFolders((d) => {
          d.order[orderKey] = next
          if (fid) d.assign[dragId] = fid
          else delete d.assign[dragId]
        })
      }
      // 文件夹排序/嵌套（同级排序）
      const moveFolder = (id, beforeId) => {
        updateFolders((d) => {
          const target = d.folders.find((f) => f.id === id)
          if (!target) return
          const siblings = d.folders.filter((f) => f.workspaceId === target.workspaceId && f.parentId === target.parentId && f.id !== id)
          const at = beforeId == null ? siblings.length : siblings.findIndex((f) => f.id === beforeId)
          if (at === -1) return
          const next = siblings.slice()
          next.splice(at, 0, target)
          // 重写同父级顺序：用 order 记录
          const key = target.parentId || 'none_' + target.workspaceId
          d.order[key] = next.map((f) => f.id)
        })
      }

      // ---- 派生数据 ----
      // 分组内工作区顺序列表
      const folderOrderedWs = (key) => {
        const members = items.filter((w) => (groupsData.assign[w.workspaceId] || 'none') === key)
        const order = (groupsData.order || {})[key]
        if (!order || order.length === 0) return members
        const byId = {}
        members.forEach((w) => { byId[w.workspaceId] = w })
        const seen = {}
        const ordered = []
        order.forEach((id) => {
          if (byId[id] && !seen[id]) { seen[id] = true; ordered.push(byId[id]) }
        })
        const rest = members.filter((w) => !seen[w.workspaceId])
        return ordered.concat(rest)
      }
      // 某工作区/文件夹内的会话有序列表（key 为 'none' 表示未分类）
      const orderedSessionsIn = (key, wsId) => {
        const ws = items.find((w) => w.workspaceId === wsId)
        const members = []
        if (ws) {
          ws.sessionIds.forEach((id) => {
            // 不显示已归档会话
            if (!archivedSet[id] && sessions[id] && (foldersData.assign[id] || 'none') === key) members.push(sessions[id])
          })
        }
        const orderKey = key === 'none' ? ('none:' + wsId) : key
        const order = (foldersData.order || {})[orderKey]
        if (!order || order.length === 0) return members
        const byId = {}
        members.forEach((s) => { byId[s.id] = s })
        const seen = {}
        const ordered = []
        order.forEach((id) => {
          if (byId[id] && !seen[id]) { seen[id] = true; ordered.push(byId[id]) }
        })
        const rest = members.filter((s) => !seen[s.id])
        return ordered.concat(rest)
      }
      // 某工作区下顶级文件夹
      const topFoldersOf = (wsId) => {
        return foldersData.folders
          .filter((f) => f.workspaceId === wsId && f.parentId === null)
          .sort((a, b) => {
            const key = 'none_' + wsId
            const order = (foldersData.order || {})[key] || []
            const ia = order.indexOf(a.id)
            const ib = order.indexOf(b.id)
            if (ia === -1 && ib === -1) return 0
            if (ia === -1) return 1
            if (ib === -1) return -1
            return ia - ib
          })
      }
      // 某文件夹的子文件夹
      const childFoldersOf = (fid) => {
        const parent = foldersData.folders.find((f) => f.id === fid)
        if (!parent) return []
        return foldersData.folders
          .filter((f) => f.parentId === fid)
          .sort((a, b) => {
            const order = (foldersData.order || {})[fid] || []
            const ia = order.indexOf(a.id)
            const ib = order.indexOf(b.id)
            if (ia === -1 && ib === -1) return 0
            if (ia === -1) return 1
            if (ib === -1) return -1
            return ia - ib
          })
      }
      // 某工作区未分类会话
      const unclassifiedOf = (wsId) => orderedSessionsIn('none', wsId)
      // 某文件夹内会话
      const sessionsOfFolder = (fid, wsId) => orderedSessionsIn(fid, wsId)
      // 某工作区全部文件夹（含嵌套），按树序返回 [{folder, depth}]
      const flatFoldersOf = (wsId) => {
        const result = []
        const walk = (parentId, depth) => {
          const children = foldersData.folders
            .filter((f) => f.workspaceId === wsId && f.parentId === parentId)
            .sort((a, b) => {
              const order = (foldersData.order || {})[parentId || ('none_' + wsId)] || []
              const ia = order.indexOf(a.id)
              const ib = order.indexOf(b.id)
              if (ia === -1 && ib === -1) return 0
              if (ia === -1) return 1
              if (ib === -1) return -1
              return ia - ib
            })
          children.forEach((f) => {
            result.push({ folder: f, depth })
            walk(f.id, depth + 1)
          })
        }
        walk(null, 0)
        return result
      }

      // ---- 会话/工作区操作 ----
      const renameSessionById = (sessionId, title) => {
        let binding = null
        if (sessionsApi && typeof sessionsApi.binding === 'function') binding = sessionsApi.binding(sessionId)
        const session = binding && binding.session
        if (!session || typeof session.rename !== 'function') {
          console.error('dshorg: 会话绑定不可用于重命名')
          return
        }
        session.rename(title).then((r) => {
          if (r && !r.ok) console.error('dshorg: 重命名被拒绝', r.error && r.error.message)
        }).catch((err) => console.error('dshorg: 重命名失败', err))
      }
      const forkSession = (sessionId) => {
        if (!sessionsApi || typeof sessionsApi.fork !== 'function') return
        sessionsApi.fork({ sessionId, increaseTitle: true })
          .then((childId) => {
            if (!childId) return
            openSession(childId)
            // 分叉的子会话立即继承源会话的文件夹归类（源在未分类则子会话也留在未分类）。
            // fork 返回前子会话已同步进会话存储，清理效应不会误删，可安全立即归类。
            const fid = foldersData.assign[sessionId]
            if (fid) updateFolders((d) => { d.assign[childId] = fid })
          })
          .catch((err) => console.error('dshorg: 分叉失败', err))
      }
      const archiveSession = (sessionId) => {
        if (!workspacesApi) return
        workspacesApi.archiveSession(sessionId).catch((err) => console.error('dshorg: 归档失败', err))
      }
      // 新建会话：复刻原生 UiWorkspaceService.startSession 流程。
      // workspaces 服务上没有 startSession 方法（原生在 uiWorkspace 服务上），
      // 这里用 sessions.create + sessions.open + layout.selectPanel 组合实现：
      //   1. 解析目标工作区：显式指定 ?? 当前会话所在工作区 ?? 列表第一个工作区；
      //   2. 复用该工作区未归档的空白会话，没有则 sessions.create({ workspaceId })；
      //   3. 打开会话并切回对话面板。
      const connectWorkspace = async (workspaceId) => {
        const ws = items.find((w) => w.workspaceId === workspaceId)
        if (!ws) throw new Error('dshorg: 未知工作区 ' + workspaceId)
        // 复用空白会话（对齐原生 connectWorkspace 的复用判定）
        const ids = (sState && sState.ids) || []
        for (const id of ids) {
          const summary = sessions[id]
          if (summary && summary.blank && summary.cwd === ws.path && ws.sessionIds.indexOf(summary.id) !== -1 && !archivedSet[id]) {
            return summary.id
          }
        }
        return await sessionsApi.create({ workspaceId })
      }
      const startSession = (workspaceId) => {
        if (!sessionsApi || typeof sessionsApi.create !== 'function') return Promise.resolve(null)
        try {
          let target = workspaceId || null
          if (!target) {
            // 当前会话所在工作区
            const cur = current
            if (cur !== undefined && cur !== null) {
              const curWs = items.find((w) => w.sessionIds.indexOf(cur) !== -1)
              if (curWs) target = curWs.workspaceId
            }
          }
          if (!target && items.length > 0) target = items[0].workspaceId
          if (!target) {
            // 没有任何工作区：清空到「新建会话」纯视图（对齐原生行为）
            if (typeof sessionsApi.clear === 'function') sessionsApi.clear()
            if (layoutApi && typeof layoutApi.selectPanel === 'function') layoutApi.selectPanel(null)
            return Promise.resolve(null)
          }
          // 返回创建/复用的会话 id，供调用方（文件夹内新建）做明确归类
          return connectWorkspace(target)
            .then((sessionId) => { if (sessionId) openSession(sessionId); return sessionId || null })
            .catch((err) => { console.error('dshorg: 新建会话失败', err); return null })
        } catch (err) {
          console.error('dshorg: startSession', err)
          return Promise.resolve(null)
        }
      }
      const addWorkspace = async (gid) => {
        if (!workspacesApi) return
        try {
          // 通过 host 原生目录选择器 Remote 选取目录。
          // pick() 返回 {ok, value, error}：ok 时 value 为路径或 null（取消）。
          let path = null
          const picker = (typeof getDirectoryPicker === 'function') ? getDirectoryPicker() : null
          if (picker && typeof picker.pick === 'function') {
            const result = await picker.pick()
            if (result && result.ok) {
              path = result.value
            } else if (result && result.error && result.error.message) {
              console.error('dshorg: 目录选择失败:', result.error.message)
            }
          } else {
            console.error('dshorg: 目录选择器 Remote 不可用')
            return
          }
          if (!path) return
          const ws = await workspacesApi.create({ path })
          if (gid) assignWorkspaceToGroup(ws.workspaceId, gid)
        } catch (err) {
          console.error('dshorg: 添加工作区失败', err)
        }
      }
      const deleteWorkspace = (ws) => {
        if (!workspacesApi || !window.confirm('删除工作区「' + ws.title + '」？仅移除注册，目录与所有会话日志会保留。')) return
        workspacesApi.delete(ws.workspaceId)
          .then(() => {
            updateGroups((d) => { delete d.assign[ws.workspaceId] })
            updateFolders((d) => {
              const doomed = new Set()
              const queue = d.folders.filter((f) => f.workspaceId === ws.workspaceId).map((f) => f.id)
              while (queue.length > 0) {
                const cur = queue.shift()
                doomed.add(cur)
                d.folders.forEach((f) => { if (f.parentId === cur && !doomed.has(f.id)) queue.push(f.id) })
              }
              d.folders = d.folders.filter((f) => !doomed.has(f.id))
            })
          })
          .catch((err) => console.error('dshorg: 删除工作区失败', err))
      }

      // ---- 渲染辅助 ----

      // 会话状态点：运行中（蓝·脉动）/ 已完成（绿）/ 空闲（灰）
      const statusOf = (s) => {
        if (s && s.running) return 'run'
        if (s && s.completed === true) return 'done'
        return 'idle'
      }
      const statusTitleOf = (s) => {
        const st = statusOf(s)
        return st === 'run' ? '运行中' : st === 'done' ? '已完成' : '空闲'
      }

      // 未命名会话的显示：DSH 对无标题会话回退显示工作区名，多条未命名会话无法区分。
      // 回退优先级：首条提问文本（投影 titleInput——重启强杀导致检查点滞后的已标题会话也覆盖）→「未命名 · 时间」。
      // 正式标题由 LLM 在会话内首次对话后生成；分叉会话若源有标题则继承，也可随时通过 ⋯ 菜单手动重命名。
      const fmtTime = (ms) => {
        const d = new Date(ms)
        const p = (n) => String(n).padStart(2, '0')
        return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
      }
      const sessDisplayTitle = (s) => {
        if (!s) return ''
        if (s.title !== undefined && s.title !== '') return s.displayTitle || s.title
        const ti = s.projectionValues && s.projectionValues.titleInput
        const first = ti && ti.first && ti.first.text
        if (first) {
          const t = String(first).replace(/\s+/g, ' ').trim()
          if (t) return t.length > 40 ? t.slice(0, 40) + '…' : t
        }
        return '未命名 · ' + fmtTime(s.updatedAt || Date.now())
      }

      // 会话行（fid 为所在文件夹 id，null 表示未分类；wsId 为所属工作区）
      const renderSessionRow = (s, fid, wsId) => {
        if (!s) return null
        const editingThis = editing && editing.kind === 'session' && editing.id === s.id
        // 会话行拖拽目标：接收会话（同文件夹内排序 / 跨文件夹移动）
        const dropProps = {
          onDragOver: (e) => {
            const p = parsePayload(e)
            if (!p) return
            e.preventDefault()
            e.stopPropagation()
            if (p.kind === 'session') {
              e.dataTransfer.dropEffect = 'move'
              markOver({ kind: 'session', id: s.id, half: halfOf(e) }, e)
            }
          },
          onDragLeave: () => { if (dragRef.lastOver && dragRef.lastOver.id === s.id) { setDropMarker(null); setDropLine(null) } },
          onDrop: (e) => {
            const p = parsePayload(e)
            if (!p) return
            e.preventDefault()
            e.stopPropagation()
            if (p.kind === 'session' && p.id !== s.id && wsId) {
              moveSessionInto(fid, wsId, p.id, halfOf(e) === 'before' ? s.id : undefined)
            }
            onDragEnd()
          },
        }
        const row = React.createElement('div', Object.assign({
          key: s.id,
          className: 'dsorg-sess' + (current === s.id ? ' current' : '') + ((dropMarker && dropMarker.kind === 'session' && dropMarker.id === s.id) ? ' dsorg-ws-target' : ''),
          draggable: true,
          onDragStart: (e) => onDragStart(e, 'session:' + s.id + ':' + (fid || '')),
          onDragEnd: onDragEnd,
        }, dropProps, clickNoDrag(() => openSession(s.id))),
          React.createElement('div', { className: 'dsorg-sess-row1' },
            React.createElement('span', { className: 'dsorg-st ' + statusOf(s), title: statusTitleOf(s) }),
            editingThis
              ? React.createElement(InlineEditor, {
                initial: s.title || '',
                placeholder: '会话标题',
                onCommit: (t) => { renameSessionById(s.id, t); setEditing(null) },
                onCancel: () => setEditing(null),
              })
              : React.createElement('span', { className: 'dsorg-sess-title', title: sessDisplayTitle(s) }, sessDisplayTitle(s) || '（无标题）'),
          ),
          React.createElement('div', { className: 'dsorg-sacts' },
            React.createElement(IconBtn, {
              title: '更多操作',
              icon: IC_MORE,
              className: 'dsorg-mbtn',
              onClick: (e) => openMenu({ kind: 'session', id: s.id, wsId, x: e.clientX, y: e.clientY }),
            }),
          ),
        )
        return row
      }

      // 文件夹行（递归渲染子文件夹 + 会话）
      const renderFolder = (f, depth, wsId) => {
        const children = childFoldersOf(f.id)
        const sessList = sessionsOfFolder(f.id, wsId)
        const expanded = !!expFolders[f.id]
        const editingThis = editing && editing.kind === 'folder' && editing.id === f.id
        const parts = []
        // 拖拽目标属性：文件夹行可接收会话（进入该文件夹）与文件夹（排序）
        const dropProps = {
          onDragOver: (e) => {
            const p = parsePayload(e)
            if (!p) return
            e.preventDefault()
            e.stopPropagation()
            e.dataTransfer.dropEffect = p.kind === 'session' || p.kind === 'folder' ? 'move' : 'none'
            if (p.kind === 'session' || p.kind === 'folder') {
              markOver({ kind: 'folder', id: f.id }, e)
            }
          },
          onDragLeave: () => { if (dragRef.lastOver && dragRef.lastOver.id === f.id) { setDropMarker(null); setDropLine(null) } },
          onDrop: (e) => {
            const p = parsePayload(e)
            if (!p) return
            e.preventDefault()
            e.stopPropagation()
            if (p.kind === 'session') {
              assignSessionToFolder(p.id, f.id)
            } else if (p.kind === 'folder' && p.id !== f.id) {
              // 文件夹拖到另一个文件夹：成为其子文件夹（防循环：不能把祖先挂到自己的后代下）
              updateFolders((d) => {
                let cur = d.folders.find((x) => x.id === f.id)
                let guard = 0
                while (cur && guard < 50) {
                  if (cur.parentId === p.id) return
                  cur = cur.parentId ? d.folders.find((x) => x.id === cur.parentId) : null
                  guard++
                }
                d.folders.forEach((x) => { if (x.id === p.id) x.parentId = f.id })
              })
            }
            onDragEnd()
          },
        }
        parts.push(React.createElement('div', Object.assign({
          key: f.id,
          className: 'dsorg-frow' + ((dropMarker && dropMarker.kind === 'folder' && dropMarker.id === f.id) ? ' dsorg-drop' : ''),
          draggable: true,
          onDragStart: (e) => onDragStart(e, 'folder:' + f.id),
          onDragEnd: onDragEnd,
        }, dropProps, clickNoDrag(() => setExpFolders((prev) => Object.assign({}, prev, { [f.id]: !prev[f.id] })))),
          React.createElement(Icon, { d: IC_CHEVRON, size: 10, className: 'dsorg-chev' + (expanded ? '' : ' closed') }),
          React.createElement(Icon, { d: IC_FOLDER, size: 11 }),
          editingThis
            ? React.createElement(InlineEditor, {
              initial: f.name,
              placeholder: '文件夹名称',
              onCommit: (t) => { renameFolder(f.id, t); setEditing(null) },
              onCancel: () => setEditing(null),
            })
            : React.createElement('span', {
              className: 'dsorg-frow-name',
              title: f.name,
            }, f.name),
          React.createElement('span', { className: 'dsorg-facts2' },
            React.createElement(IconBtn, { title: '新建会话', icon: IC_SESSION, onClick: () => { startSession(wsId).then((sid) => { if (sid) updateFolders((d) => { d.assign[sid] = f.id }) }) } }),
            React.createElement(IconBtn, { title: '新建子文件夹', icon: IC_NEWFOLDER, onClick: () => { setExpFolders((prev) => Object.assign({}, prev, { [f.id]: true })); setEditing({ kind: 'new-folder', wsId, parentId: f.id }) } }),
            React.createElement(IconBtn, { title: '重命名', icon: IC_PENCIL, onClick: () => setEditing({ kind: 'folder', id: f.id }) }),
            React.createElement(IconBtn, { title: '删除', icon: IC_TRASH, danger: true, onClick: () => deleteFolder(f.id) }),
          ),
        ))
        if (expanded) {
          // 新建子文件夹行内编辑
          if (editing && editing.kind === 'new-folder' && editing.wsId === wsId && editing.parentId === f.id) {
            parts.push(React.createElement('div', { key: 'newsubfolder-' + f.id, className: 'dsorg-newrow' },
              React.createElement(Icon, { d: IC_FOLDER, size: 12 }),
              React.createElement(InlineEditor, {
                initial: '',
                placeholder: '输入子文件夹名称，回车创建',
                onCommit: (t) => { createFolder(wsId, f.id, t); setEditing(null) },
                onCancel: () => setEditing(null),
              }),
              React.createElement(IconBtn, { title: '确定', icon: IC_CHECK, ok: true, onClick: () => setEditing(null) }),
              React.createElement(IconBtn, { title: '取消', icon: IC_CLOSE, onClick: () => setEditing(null) }),
            ))
          }
          if (children.length > 0) {
            parts.push(React.createElement('div', { key: 'sub-' + f.id, className: 'dsorg-flist' },
              children.map((c) => renderFolder(c, depth + 1, wsId)),
            ))
          }
          if (sessList.length > 0) {
            parts.push(React.createElement('div', { key: 'sess-' + f.id, className: 'dsorg-slist' },
              sessList.map((s) => renderSessionRow(s, f.id, wsId)),
            ))
          }
        }
        return parts
      }

      // 工作区行（含第二级：文件夹 + 会话）
      const renderWorkspaceGroup = (ws, gid) => {
        const expanded = !!expWorkspaces[ws.workspaceId]
        const topFolders = topFoldersOf(ws.workspaceId)
        const unclassified = unclassifiedOf(ws.workspaceId)
        const editingThis = editing && editing.kind === 'workspace' && editing.id === ws.workspaceId
        const parts = []
        // 工作区行拖拽目标：可接收工作区（排序）与文件夹（换工作区）
        const dropProps = {
          onDragOver: (e) => {
            const p = parsePayload(e)
            if (!p) return
            e.preventDefault()
            e.stopPropagation()
            e.dataTransfer.dropEffect = 'move'
            markOver({ kind: 'workspace', id: ws.workspaceId, half: halfOf(e) }, e)
          },
          onDragLeave: () => { if (dragRef.lastOver && dragRef.lastOver.id === ws.workspaceId) { setDropMarker(null); setDropLine(null) } },
          onDrop: (e) => {
            const p = parsePayload(e)
            if (!p) return
            e.preventDefault()
            e.stopPropagation()
            const half = halfOf(e)
            if (p.kind === 'workspace' && p.id !== ws.workspaceId) {
              moveWorkspaceInto(gid, p.id, half === 'before' ? ws.workspaceId : undefined)
            } else if (p.kind === 'folder') {
              updateFolders((d) => {
                d.folders.forEach((x) => { if (x.id === p.id) x.workspaceId = ws.workspaceId })
              })
            }
            onDragEnd()
          },
        }
        parts.push(React.createElement('div', Object.assign({
          key: 'w-' + ws.workspaceId,
          className: 'dsorg-ws',
          draggable: true,
          onDragStart: (e) => onDragStart(e, 'workspace:' + ws.workspaceId),
          onDragEnd: onDragEnd,
        }, dropProps),
          React.createElement('div', Object.assign({ className: 'dsorg-whead' }, clickNoDrag(() => setExpWorkspaces((prev) => Object.assign({}, prev, { [ws.workspaceId]: !prev[ws.workspaceId] })))),
            React.createElement(Icon, { d: IC_CHEVRON, size: 11, className: 'dsorg-chev' + (expanded ? '' : ' closed') }),
            editingThis
              ? React.createElement(InlineEditor, {
                initial: ws.title || '',
                placeholder: '工作区名称',
                onCommit: (t) => { if (workspacesApi && typeof workspacesApi.rename === 'function') workspacesApi.rename(ws.workspaceId, t).catch((err) => console.error('dshorg: 重命名工作区失败', err)); setEditing(null) },
                onCancel: () => setEditing(null),
              })
              : React.createElement('div', { className: 'dsorg-wmid' },
                React.createElement('div', { className: 'dsorg-wtitle', title: ws.title }, ws.title || '（未命名工作区）'),
              ),
            React.createElement('span', { className: 'dsorg-wacts' },
              React.createElement(IconBtn, {
                title: '更多操作',
                icon: IC_MORE,
                className: 'dsorg-mbtn',
                onClick: (e) => openMenu({ kind: 'workspace', id: ws.workspaceId, x: e.clientX, y: e.clientY }),
              }),
            ),
          ),
        ))
        if (expanded) {
          // 新建文件夹行内编辑
          if (editing && editing.kind === 'new-folder' && editing.wsId === ws.workspaceId && editing.parentId === null) {
            parts.push(React.createElement('div', { key: 'newfolder-' + ws.workspaceId, className: 'dsorg-newrow' },
              React.createElement(Icon, { d: IC_FOLDER, size: 12 }),
              React.createElement(InlineEditor, {
                initial: '',
                placeholder: '输入文件夹名称，回车创建',
                onCommit: (t) => { createFolder(ws.workspaceId, null, t); setEditing(null) },
                onCancel: () => setEditing(null),
              }),
              React.createElement(IconBtn, { title: '确定', icon: IC_CHECK, ok: true, onClick: () => setEditing(null) }),
              React.createElement(IconBtn, { title: '取消', icon: IC_CLOSE, onClick: () => setEditing(null) }),
            ))
          }
          if (topFolders.length > 0) {
            parts.push(React.createElement('div', { key: 'folders-' + ws.workspaceId, className: 'dsorg-flist' },
              topFolders.map((f) => renderFolder(f, 1, ws.workspaceId)),
            ))
          }
          if (unclassified.length > 0) {
            parts.push(React.createElement('div', { key: 'ulist-' + ws.workspaceId, className: 'dsorg-slist' },
              unclassified.map((s) => renderSessionRow(s, null, ws.workspaceId)),
            ))
          }
          if (topFolders.length === 0 && unclassified.length === 0) {
            parts.push(React.createElement('div', { key: 'empty-' + ws.workspaceId, className: 'dsorg-empty', style: { padding: '12px 8px' } },
              '暂无会话，点击工作区右侧「+」新建',
            ))
          }
        }
        return parts
      }

      // 分组卡片
      const renderGroupCard = (g, index) => {
        const expanded = !!expGroups[g.id]
        const wsList = folderOrderedWs(g.id)
        const editingThis = editing && editing.kind === 'group' && editing.id === g.id
        const parts = []
        // 分组卡片拖拽目标：接收工作区（进入分组）与分组（排序）
        const dropProps = {
          onDragOver: (e) => {
            const p = parsePayload(e)
            if (!p) return
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            if (p.kind === 'workspace') {
              markOver({ kind: 'group', id: g.id }, e)
            } else if (p.kind === 'group' && p.id !== g.id) {
              markOver({ kind: 'group', id: g.id, half: halfOf(e) }, e)
            }
          },
          onDragLeave: () => { if (dragRef.lastOver && dragRef.lastOver.id === g.id) { setDropMarker(null); setDropLine(null) } },
          onDrop: (e) => {
            const p = parsePayload(e)
            if (!p) return
            e.preventDefault()
            e.stopPropagation()
            if (p.kind === 'workspace') {
              assignWorkspaceToGroup(p.id, g.id)
            } else if (p.kind === 'group' && p.id !== g.id) {
              moveGroup(p.id, halfOf(e) === 'before' ? g.id : undefined)
            }
            onDragEnd()
          },
        }
        parts.push(React.createElement('div', Object.assign({
          key: g.id,
          className: 'dsorg-fcard' + (dragState === 'group:' + g.id ? ' dsorg-dragging' : ''),
          draggable: true,
          onDragStart: (e) => onDragStart(e, 'group:' + g.id),
          onDragEnd: onDragEnd,
        }, dropProps),
          React.createElement('div', Object.assign({ className: 'dsorg-fhead' + ((dropMarker && dropMarker.kind === 'group' && dropMarker.id === g.id) ? ' dsorg-drop' : '') }, clickNoDrag(() => setExpGroups((prev) => Object.assign({}, prev, { [g.id]: !prev[g.id] })))),
            React.createElement(Icon, { d: IC_CHEVRON, size: 11, className: 'dsorg-chev' + (expanded ? '' : ' closed') }),
            editingThis
              ? React.createElement(InlineEditor, {
                initial: g.name,
                placeholder: '分组名称',
                onCommit: (t) => { renameGroup(g.id, t); setEditing(null) },
                onCancel: () => setEditing(null),
              })
              : React.createElement('span', { className: 'dsorg-fname', title: g.name }, g.name),
            React.createElement('span', { className: 'dsorg-facts' },
              React.createElement(IconBtn, { title: '新建工作区', icon: IC_PLUS, onClick: () => addWorkspace(g.id) }),
              React.createElement(IconBtn, { title: '重命名', icon: IC_PENCIL, onClick: () => setEditing({ kind: 'group', id: g.id }) }),
              React.createElement(IconBtn, { title: '删除', icon: IC_TRASH, danger: true, onClick: () => deleteGroup(g.id) }),
            ),
          ),
          expanded ? React.createElement('div', { className: 'dsorg-wlist' }, wsList.map((ws) => renderWorkspaceGroup(ws, g.id))) : null,
        ))
        return parts
      }

      // ---- 折叠态（rail）----
      const rail = React.createElement('div', { className: 'dsorg-rail' },
        React.createElement('button', { type: 'button', className: 'dsorg-rail-btn', title: '展开侧边栏', 'aria-label': '展开侧边栏', onClick: () => { if (expandSidebar) expandSidebar() } },
          React.createElement(Icon, { d: IC_FOLDER, size: 14 }),
        ),
        React.createElement('button', { type: 'button', className: 'dsorg-rail-btn', title: '新建会话', 'aria-label': '新建会话', onClick: () => startSession(undefined) },
          React.createElement(Icon, { d: IC_SESSION, size: 14 }),
        ),
      )

      // ---- 搜索态 ----
      const searchBody = (() => {
        const parts = []
        if (q) {
          if (titleMatches.length > 0) {
            parts.push(React.createElement('div', { key: 'sec1', className: 'dsorg-sec' }, '标题匹配 (' + String(titleMatches.length) + ')'))
            titleMatches.forEach((id) => parts.push(renderSessionRow(sessions[id], null, null)))
          }
          if (remote.status !== 'idle') {
            parts.push(React.createElement('div', { key: 'sec2', className: 'dsorg-sec' },
              '消息匹配',
              remote.status === 'loading' ? React.createElement('small', null, '搜索中…') : null,
              remote.status === 'ready' ? React.createElement('small', null, '(' + String(remote.items.length) + ')') : null,
              remote.status === 'error' ? React.createElement('small', null, '（搜索失败，详见控制台）') : null,
            ))
            if (remote.status === 'ready') {
              remote.items.forEach((item) => {
                const s = sessions[item.sessionId]
                parts.push(React.createElement('div', {
                  key: item.sessionId + '-m',
                  className: 'dsorg-sess',
                  onClick: () => openSession(item.sessionId),
                  title: '打开会话',
                },
                  React.createElement('div', { className: 'dsorg-srow' },
                    React.createElement('span', { className: 'dsorg-st ' + statusOf(s), title: statusTitleOf(s) }),
                    React.createElement('span', { className: 'dsorg-sess-title' }, s ? sessDisplayTitle(s) : item.sessionId),
                  ),
                  React.createElement('span', { className: 'dsorg-snip' }, item.snippet || ''),
                ))
              })
              if (remote.items.length === 0) {
                parts.push(React.createElement('div', { key: 'nom', className: 'dsorg-empty' }, '没有找到消息匹配'))
              }
              if (remote.hasMore) {
                parts.push(React.createElement('div', { key: 'more', className: 'dsorg-sec' }, '结果较多，请缩小关键词'))
              }
            }
          }
          if (parts.length === 0) {
            parts.push(React.createElement('div', { key: 'empty', className: 'dsorg-empty' }, '没有匹配结果'))
          }
        }
        return parts
      })()

      // ---- 主视图 ----
      const treeBody = (() => {
        if (q) return searchBody
        const parts = []
        // 新建分组行内编辑
        if (editing && editing.kind === 'new-group') {
          parts.push(React.createElement('div', { key: 'newgroup', className: 'dsorg-newrow' },
            React.createElement(Icon, { d: IC_FOLDER, size: 12 }),
            React.createElement(InlineEditor, {
              initial: '',
              placeholder: '输入分组名称，回车创建',
              onCommit: (t) => { createGroup(t); setEditing(null) },
              onCancel: () => setEditing(null),
            }),
            React.createElement(IconBtn, { title: '确定', icon: IC_CHECK, ok: true, onClick: () => setEditing(null) }),
            React.createElement(IconBtn, { title: '取消', icon: IC_CLOSE, onClick: () => setEditing(null) }),
          ))
        }
        groupsData.groups.forEach((g, i) => parts.push(renderGroupCard(g, i)))
        // 未分组卡片
        const noneList = folderOrderedWs('none')
        const noneExpanded = !!expWorkspaces['__none__']
        const noneDrop = {
          onDragOver: (e) => {
            const p = parsePayload(e)
            if (!p) return
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            if (p.kind === 'workspace') markOver({ kind: 'none' }, e)
          },
          onDragLeave: () => { if (dragRef.lastOver && dragRef.lastOver.kind === 'none') { setDropMarker(null); setDropLine(null) } },
          onDrop: (e) => {
            const p = parsePayload(e)
            if (!p) return
            e.preventDefault()
            e.stopPropagation()
            if (p.kind === 'workspace') assignWorkspaceToGroup(p.id, null)
            onDragEnd()
          },
        }
        parts.push(React.createElement('div', Object.assign({
          key: 'none',
          className: 'dsorg-fcard',
          style: { animationDelay: String(groupsData.groups.length * 35) + 'ms' },
        }, noneDrop),
          React.createElement('div', Object.assign({
            className: 'dsorg-fhead' + ((dropMarker && dropMarker.kind === 'none') ? ' dsorg-drop' : ''),
          }, clickNoDrag(() => setExpWorkspaces((prev) => Object.assign({}, prev, { __none__: !prev.__none__ })))),
            React.createElement(Icon, { d: IC_CHEVRON, size: 11, className: 'dsorg-chev' + (noneExpanded ? '' : ' closed') }),
            React.createElement('span', { className: 'dsorg-fname' }, '未分组'),
            React.createElement('span', { className: 'dsorg-facts' },
              React.createElement(IconBtn, { title: '新建工作区（未分组）', icon: IC_PLUS, onClick: () => addWorkspace(null) }),
            ),
          ),
          noneExpanded ? React.createElement('div', { className: 'dsorg-wlist' }, noneList.map((ws) => renderWorkspaceGroup(ws, null))) : null,
        ))
        if (items.length === 0 && groupsData.groups.length === 0 && !(editing && editing.kind === 'new-group')) {
          parts.push(React.createElement('div', { key: 'empty', className: 'dsorg-empty' },
            React.createElement('span', { className: 'dsorg-empty-ic' }, React.createElement(Icon, { d: IC_FOLDER, size: 15 })),
            React.createElement('p', null, React.createElement('b', null, '还没有工作区'), '，点击上方按钮开始管理'),
          ))
        }
        return parts
      })()

      if (!wide) return rail

      // ---- 会话/工作区 ⋯ 菜单 ----
      const renderMenu = () => {
        if (!menuFor) return null
        const items = []
        if (menuFor.kind === 'session') {
          // 移动到文件夹
          items.push(React.createElement('div', { key: 'sec', className: 'dsorg-menu-sec' }, '移动到文件夹'))
          const flat = flatFoldersOf(menuFor.wsId)
          flat.forEach(({ folder, depth }) => {
            const cur = foldersData.assign[menuFor.id] === folder.id
            items.push(React.createElement('div', {
              key: folder.id,
              className: 'dsorg-menu-item' + (cur ? ' cur' : ''),
              style: { paddingLeft: 10 + depth * 14 },
              onClick: () => { assignSessionToFolder(menuFor.id, folder.id); setMenuFor(null); setMenuPos(null) },
            },
              React.createElement(Icon, { d: IC_FOLDER, size: 11 }),
              React.createElement('span', { className: 'dsorg-menu-label' }, folder.name),
              cur ? React.createElement('span', { className: 'dsorg-menu-check' }, '✓') : null,
            ))
          })
          const curNone = !foldersData.assign[menuFor.id]
          items.push(React.createElement('div', {
            key: 'none',
            className: 'dsorg-menu-item' + (curNone ? ' cur' : ''),
            style: { paddingLeft: 10 },
            onClick: () => { assignSessionToFolder(menuFor.id, null); setMenuFor(null); setMenuPos(null) },
          },
            React.createElement('span', { className: 'dsorg-menu-label' }, '未分类'),
            curNone ? React.createElement('span', { className: 'dsorg-menu-check' }, '✓') : null,
          ))
          items.push(React.createElement('div', { key: 'sep1', className: 'dsorg-menu-sep' }))
          items.push(React.createElement('div', { key: 'ren', className: 'dsorg-menu-item', onClick: () => { setEditing({ kind: 'session', id: menuFor.id }); setMenuFor(null); setMenuPos(null) } },
            React.createElement(Icon, { d: IC_PENCIL, size: 11 }),
            React.createElement('span', { className: 'dsorg-menu-label' }, '重命名'),
          ))
          items.push(React.createElement('div', { key: 'fork', className: 'dsorg-menu-item', onClick: () => { forkSession(menuFor.id); setMenuFor(null); setMenuPos(null) } },
            React.createElement(Icon, { d: IC_FORK, size: 11 }),
            React.createElement('span', { className: 'dsorg-menu-label' }, '分叉'),
          ))
          items.push(React.createElement('div', { key: 'arch', className: 'dsorg-menu-item', onClick: () => { archiveSession(menuFor.id); setMenuFor(null); setMenuPos(null) } },
            React.createElement(Icon, { d: IC_ARCHIVE, size: 11 }),
            React.createElement('span', { className: 'dsorg-menu-label' }, '归档'),
          ))
        } else if (menuFor.kind === 'workspace') {
          // 移动到分组
          items.push(React.createElement('div', { key: 'sec', className: 'dsorg-menu-sec' }, '移动到分组'))
          groupsData.groups.forEach((g) => {
            const cur = groupsData.assign[menuFor.id] === g.id
            items.push(React.createElement('div', {
              key: g.id,
              className: 'dsorg-menu-item' + (cur ? ' cur' : ''),
              onClick: () => { assignWorkspaceToGroup(menuFor.id, g.id); setMenuFor(null); setMenuPos(null) },
            },
              React.createElement('span', { className: 'dsorg-menu-label' }, g.name),
              cur ? React.createElement('span', { className: 'dsorg-menu-check' }, '✓') : null,
            ))
          })
          const curNone = !groupsData.assign[menuFor.id]
          items.push(React.createElement('div', {
            key: 'none',
            className: 'dsorg-menu-item' + (curNone ? ' cur' : ''),
            onClick: () => { assignWorkspaceToGroup(menuFor.id, null); setMenuFor(null); setMenuPos(null) },
          },
            React.createElement('span', { className: 'dsorg-menu-label' }, '未分组'),
            curNone ? React.createElement('span', { className: 'dsorg-menu-check' }, '✓') : null,
          ))
          items.push(React.createElement('div', { key: 'sep1', className: 'dsorg-menu-sep' }))
          items.push(React.createElement('div', { key: 'newsess', className: 'dsorg-menu-item', onClick: () => { startSession(menuFor.id); setMenuFor(null); setMenuPos(null) } },
            React.createElement(Icon, { d: IC_SESSION, size: 11 }),
            React.createElement('span', { className: 'dsorg-menu-label' }, '新建会话'),
          ))
          items.push(React.createElement('div', { key: 'newfolder', className: 'dsorg-menu-item', onClick: () => { setEditing({ kind: 'new-folder', wsId: menuFor.id, parentId: null }); setMenuFor(null); setMenuPos(null) } },
            React.createElement(Icon, { d: IC_NEWFOLDER, size: 11 }),
            React.createElement('span', { className: 'dsorg-menu-label' }, '新建文件夹'),
          ))
          items.push(React.createElement('div', { key: 'ren', className: 'dsorg-menu-item', onClick: () => { setEditing({ kind: 'workspace', id: menuFor.id }); setMenuFor(null); setMenuPos(null) } },
            React.createElement(Icon, { d: IC_PENCIL, size: 11 }),
            React.createElement('span', { className: 'dsorg-menu-label' }, '重命名'),
          ))
          items.push(React.createElement('div', { key: 'del', className: 'dsorg-menu-item', onClick: () => { const ws = items.find((w) => w.workspaceId === menuFor.id); if (ws) deleteWorkspace(ws); setMenuFor(null); setMenuPos(null) } },
            React.createElement(Icon, { d: IC_TRASH, size: 11 }),
            React.createElement('span', { className: 'dsorg-menu-label' }, '删除'),
          ))
        }
        const style = { left: menuFor.x, top: menuFor.y }
        return React.createElement('div', { className: 'dsorg-menu', style, onClick: (e) => e.stopPropagation() }, items)
      }

      // 全部展开判定：分组、工作区、未分组卡片、文件夹都展开时显示「收起」
      const allOpen = (groupsData.groups.length === 0 || groupsData.groups.every((g) => !!expGroups[g.id]))
        && (items.length === 0 || items.every((w) => !!expWorkspaces[w.workspaceId]))
        && !!expWorkspaces['__none__']
        && (foldersData.folders.length === 0 || foldersData.folders.every((f) => !!expFolders[f.id]))

      return React.createElement('div', { className: 'dsorg-root' },
        React.createElement('header', { className: 'dsorg-head' },
          React.createElement('span', { className: 'dsorg-title' },
            React.createElement('span', { className: 'dsorg-title-chip' }, React.createElement(Icon, { d: IC_FOLDER, size: 11 })),
            '工作区',
          ),
          React.createElement('span', { className: 'dsorg-head-actions' },
            React.createElement('button', {
              type: 'button',
              className: 'dsorg-hbtn-ic' + (allOpen ? ' on' : ''),
              title: allOpen ? '收起全部分组' : '展开全部分组',
              'aria-label': allOpen ? '收起全部分组' : '展开全部分组',
              onClick: () => {
                if (allOpen) {
                  // 全部收起：分组、工作区、未分组卡片、文件夹
                  setExpGroups({}); setExpWorkspaces({}); setExpFolders({})
                } else {
                  // 全部展开
                  const eg = {}
                  groupsData.groups.forEach((g) => { eg[g.id] = true })
                  setExpGroups(eg)
                  const ew = {}
                  items.forEach((w) => { ew[w.workspaceId] = true })
                  ew['__none__'] = true
                  setExpWorkspaces(ew)
                  const ef = {}
                  foldersData.folders.forEach((f) => { ef[f.id] = true })
                  setExpFolders(ef)
                }
              },
            }, React.createElement(Icon, { d: allOpen ? IC_FOLD : IC_UNFOLD, size: 13 })),
            React.createElement('button', { type: 'button', className: 'dsorg-hbtn', title: '新建会话', onClick: () => startSession(undefined) },
              React.createElement(Icon, { d: IC_SESSION, size: 12 }),
              '会话',
            ),
            React.createElement('button', { type: 'button', className: 'dsorg-hbtn', title: '添加工作区', onClick: () => addWorkspace(null) },
              React.createElement(Icon, { d: IC_PLUS, size: 12 }),
              '工作区',
            ),
            React.createElement('button', {
              type: 'button',
              className: 'dsorg-hbtn dsorg-hbtn-primary' + ((editing && editing.kind === 'new-group') ? ' dsorg-hbtn-on' : ''),
              title: '新建分组',
              onClick: () => ((editing && editing.kind === 'new-group') ? setEditing(null) : setEditing({ kind: 'new-group' })),
            },
              React.createElement(Icon, { d: IC_FOLDER, size: 11 }),
              '分组',
            ),
          ),
        ),
        React.createElement('div', { className: 'dsorg-srch' },
          React.createElement(Icon, { d: IC_SEARCH, size: 12 }),
          React.createElement('input', {
            type: 'text',
            placeholder: '搜索会话…',
            value: query,
            onChange: (e) => setQuery(e.target.value),
            'aria-label': '搜索会话',
          }),
          query ? React.createElement('button', { type: 'button', className: 'dsorg-clear', title: '清除', 'aria-label': '清除搜索', onClick: () => setQuery('') },
            React.createElement(Icon, { d: IC_CLOSE, size: 10 }),
          ) : null,
        ),
        React.createElement('div', { className: 'dsorg-tree' }, treeBody),
        dropLine !== null
          ? React.createElement('span', { className: 'dsorg-floatline', style: { top: dropLine.top, left: dropLine.left, width: dropLine.width } })
          : null,
        renderMenu(),
      )
    }

    // ==================== 插件注册 ====================

    return {
      name: 'session-organizer',
      inject: ['slots'],
      apply(ctx) {
        // CSS 注入（卸载时移除）
        const style = document.createElement('style')
        style.setAttribute('data-dsh-dsorg-css', '')
        style.textContent = CSS
        document.head.appendChild(style)
        ctx.effect(() => () => { style.remove() }, 'dshorg: css')

        const slots = ctx.get('slots')
        if (slots === undefined) return
        slots.inject('sidebar.workspaces', () => slots.register(
          // 单槽位：以更低 priority 顶替内置工作区列表（升序，最低者渲染）
          { name: 'sidebar.workspaces', priority: -100 },
          (props) => React.createElement(Browser, {
            wide: props.wide,
            expandSidebar: props.expandSidebar,
            useSessions: props.useSessions,
            useWorkspaces: props.useWorkspaces,
            workspacesApi: ctx.get('workspaces'),
            sessionsApi: ctx.get('sessions'),
            // 布局服务：新建/打开会话后切回对话面板（selectPanel(null)）
            layoutApi: ctx.get('layout'),
            // 惰性解析 host 原生目录选择器 Remote（由 ui-workspace 插件挂载）。
            // 注意：这是一个嵌套服务，规范名是 'remote.directoryPicker'
            // （与 ui-workspace 的 inject 声明、session-categories 的
            //   ctx.get('remote.sessionCategories') 同款模式）；
            // cordis 的 ctx 上直接属性访问未声明 inject 的服务会抛错，
            // 必须用 ctx.get(嵌套服务名) 安全访问（未就绪返回 undefined）。
            getDirectoryPicker: () => ctx.get('remote.directoryPicker') || null,
          }),
        ))
      },
    }
  },
})
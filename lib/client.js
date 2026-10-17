// dsh-session-organizer — 浏览器半（伴随模式 v0.2.0）。
// 不再替换官方侧栏；在官方会话列表上以官方扩展位叠加文件夹能力：
//   1. 会话"..."菜单项「移动到文件夹」（sidebar.workspaces.session.menu.item，order 500）
//   2. 会话行首彩色文件夹标签（sidebar.session.row.leading；运行中的会话显示官方状态点，标签让位）
//   3. shell.overlay：移动弹窗 + 管理弹窗
//   4. 侧栏底部按钮：打开管理弹窗（sidebar.footer.action）
// host 半（/api/dshorg/* 路由与 ~/.dsh/dshorg-*.json 存储）原样保留，旧数据完全兼容。
window.__ModuleLoader__.load({
  id: 'dsh-session-organizer',
  factory: (require) => {
    'use strict'
    const React = require('react')

    // ==================== 常量与图标 ====================

    /** localStorage 离线缓存键（host 路由不可达时的只读回退）。 */
    const FOLDERS_KEY = 'dsh.dshorg.folders.v1'
    /** 官方菜单项顺序：pin 100 / rename 200 / fork 300 / archive 400 / session-id 450。 */
    const MENU_ORDER = 500

    // SVG path（线性图标，24 视窗）
    const IC_FOLDER = 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z'
    const IC_PLUS = 'M12 5v14M5 12h14'
    const IC_TRASH = 'M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6'
    const IC_CLOSE = 'M6 6l12 12M18 6L6 18'
    const IC_CHECK = 'M4 12l5 5L20 6'
    const IC_PENCIL = 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'

    // ==================== 基础工具 ====================

    /** 生成短随机 id（文件夹/新建用）。 */
    function uid() {
      return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    }

    /** 线性图标组件。 */
    function Icon({ d, size = 14 }) {
      return React.createElement('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, style: { flex: 'none' },
      }, React.createElement('path', { d }))
    }

    /** 轻量响应式 store（get/set/subscribe），配合 useStore 使用。 */
    function makeStore(initial) {
      let value = initial
      const listeners = new Set()
      return {
        get: () => value,
        set: (next) => { value = next; listeners.forEach((fn) => fn()) },
        subscribe: (fn) => { listeners.add(fn); return () => { listeners.delete(fn) } },
      }
    }

    /** 订阅 store 的 hook（选择器必须返回稳定引用，默认原值）。 */
    function useStore(store) {
      return React.useSyncExternalStore(store.subscribe, store.get)
    }

    // 官方菜单按钮：优先用官方原语保持视觉一致；加载失败时回退为自绘按钮。
    let MenuItemButton = null
    try { MenuItemButton = require('@deepseek-ai/dsh-client-ui-primitives').MenuItemButton } catch (err) { MenuItemButton = null }

    /** 官方 MenuItemButton 不可用时的回退菜单行。 */
    function FallbackMenuItem({ icon, onSelect, children }) {
      return React.createElement('button', {
        type: 'button', className: 'dsorgc-mi', onClick: onSelect,
      }, React.createElement('span', { className: 'dsorgc-mi-icon' }, icon), React.createElement('span', null, children))
    }

    // ==================== 数据层 ====================

    /** 文件夹数据 store：{ folders: [{id, workspaceId, name, parentId}], assign: {sessionId: folderId} }。 */
    const foldersStore = makeStore({ folders: [], assign: {} })
    /** 移动弹窗请求 store：{sessionId, displayTitle} | null。 */
    const moveRequest = makeStore(null)
    /** 管理弹窗开关 store。 */
    const manageOpen = makeStore(false)

    /** 从 host 读取文件夹数据（失败时回退 localStorage 只读缓存）。 */
    async function loadFolders() {
      try {
        const res = await fetch('/api/dshorg/session-folders', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        })
        if (!res.ok) throw new Error('HTTP ' + res.status)
        const p = await res.json()
        foldersStore.set({
          folders: Array.isArray(p.folders) ? p.folders : [],
          assign: p.assign && typeof p.assign === 'object' && !Array.isArray(p.assign) ? p.assign : {},
        })
      } catch (err) {
        console.error('dshorg: 读取文件夹失败', err)
        try {
          const raw = localStorage.getItem(FOLDERS_KEY)
          if (raw) foldersStore.set(JSON.parse(raw))
        } catch (err2) { /* 离线缓存也没有：保持空数据 */ }
      }
    }

    /** 更新并持久化文件夹数据（先改内存再落盘，失败仅告警——缓存语义，可自愈）。 */
    async function saveFolders(next) {
      foldersStore.set(next)
      try { localStorage.setItem(FOLDERS_KEY, JSON.stringify(next)) } catch (err) { /* 忽略 */ }
      try {
        const res = await fetch('/api/dshorg/session-folders', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ save: true, data: next }),
        })
        if (!res.ok) console.error('dshorg: 保存失败 HTTP', res.status)
      } catch (err) {
        console.error('dshorg: 保存失败', err)
      }
    }

    /** 设置会话的文件夹归属；folderId 为空表示移出（未分类）。 */
    function assignSession(sessionId, folderId) {
      const d = foldersStore.get()
      const assign = Object.assign({}, d.assign)
      if (folderId) assign[sessionId] = folderId
      else delete assign[sessionId]
      saveFolders(Object.assign({}, d, { assign }))
    }

    /** 新建文件夹（挂在指定工作区下）。 */
    function createFolder(workspaceId, name) {
      const d = foldersStore.get()
      const folder = { id: uid(), workspaceId, name }
      saveFolders(Object.assign({}, d, { folders: d.folders.concat([folder]) }))
      return folder
    }

    /** 重命名文件夹。 */
    function renameFolder(id, name) {
      const d = foldersStore.get()
      const folders = d.folders.map((f) => (f.id === id ? Object.assign({}, f, { name: name }) : f))
      saveFolders(Object.assign({}, d, { folders: folders }))
    }

    /** 删除文件夹（级联删除子文件夹并清理会话归属）。 */
    function deleteFolder(id) {
      const d = foldersStore.get()
      const doomed = new Set([id])
      let queue = [id]
      while (queue.length > 0) {
        const cur = queue.shift()
        d.folders.forEach((f) => { if (f.parentId === cur && !doomed.has(f.id)) { doomed.add(f.id); queue.push(f.id) } })
      }
      const assign = Object.assign({}, d.assign)
      Object.keys(assign).forEach((k) => { if (doomed.has(assign[k])) delete assign[k] })
      saveFolders(Object.assign({}, d, { folders: d.folders.filter((f) => !doomed.has(f.id)), assign }))
    }

    // ==================== 响应式 hooks（模块级稳定引用） ====================

    /** 订阅文件夹数据。 */
    function useFolders() { return useStore(foldersStore) }
    /** 订阅移动弹窗请求。 */
    function useMoveRequest() { return useStore(moveRequest) }
    /** 订阅管理弹窗开关。 */
    function useManageOpen() { return useStore(manageOpen) }

    // ==================== 组件：会话菜单项 ====================

    /**
     * 会话"..."菜单项（order 500）：打开移动弹窗。
     * props 由官方槽位注入：sessionId / displayTitle / useMenuOpenState（父槽声明提供）+ 本插件 inject。
     */
    function MoveMenuItem(props) {
      const { sessionId, displayTitle, useMenuOpenState, requestMove } = props
      const [, setMenuOpen] = useMenuOpenState()
      const buttonProps = {
        icon: React.createElement(Icon, { d: IC_FOLDER, size: 14 }),
        onSelect: () => {
          setMenuOpen(false)
          requestMove(sessionId, displayTitle)
        },
        children: '移动到文件夹',
      }
      return MenuItemButton
        ? React.createElement(MenuItemButton, buttonProps)
        : React.createElement(FallbackMenuItem, buttonProps)
    }

    // ==================== 组件：会话行首文件夹标签 ====================

    /** 标签配色（按文件夹 id 稳定散列，同一文件夹永远同色）。 */
    const TAG_COLORS = ['#7aa2f7', '#9ece6a', '#e0af68', '#bb9af7', '#f7768e', '#2ac3de', '#73daca', '#ff9e64']
    function tagColor(id) {
      let h = 0
      for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
      return TAG_COLORS[h % TAG_COLORS.length]
    }

    /**
     * 行首文件夹标签：会话已归入文件夹时，显示彩色小标签（文件夹名 + 色点），
     * 让"按文件夹分类"在官方列表上直接可见；运行中的会话由官方状态点占位（本组件不渲染）。
     */
    function FolderTag({ sessionId, useFolders }) {
      const data = useFolders()
      const fid = data && data.assign ? data.assign[sessionId] : null
      const folder = fid ? (data.folders || []).find((f) => f.id === fid) : null
      if (!folder) return null
      const color = tagColor(folder.id)
      return React.createElement('span', {
        className: 'dsorgc-tag',
        style: { borderColor: color, background: 'color-mix(in srgb, ' + color + ' 16%, transparent)' },
        title: '文件夹：' + folder.name,
      },
        React.createElement('span', { className: 'dsorgc-tagdot', style: { background: color } }),
        React.createElement('span', { className: 'dsorgc-tagname' }, folder.name))
    }

    // ==================== 组件：移动弹窗 ====================

    /** 移动弹窗：列出全部文件夹 + 未分类 + 内联新建；点击即归属并关闭。 */
    function MoveDialog({ useMoveRequest, useFolders, assignSession, createFolder, closeMove, getSessions, getWorkspaces }) {
      const request = useMoveRequest()
      const data = useFolders()
      const [newName, setNewName] = React.useState('')
      if (!request) return null
      const current = data.assign[request.sessionId]
      const folders = data.folders || []
      const title = request.displayTitle || request.sessionId

      // 解析新建文件夹应归属的工作区：优先会话所在工作区，退回工作区列表首项，再退回已有文件夹的工作区
      const resolveWorkspaceId = () => {
        const snap = getSessions()
        const wsId = snap && snap.byId && snap.byId[request.sessionId] ? snap.byId[request.sessionId].workspaceId : undefined
        if (wsId) return wsId
        const wsList = getWorkspaces()
        if (Array.isArray(wsList) && wsList.length > 0 && wsList[0].workspaceId) return wsList[0].workspaceId
        if (folders.length > 0) return folders[0].workspaceId
        return ''
      }
      const pick = (folderId) => {
        assignSession(request.sessionId, folderId || null)
        closeMove()
        setNewName('')
      }
      const add = () => {
        const name = newName.trim()
        if (name === '') return
        createFolder(resolveWorkspaceId(), name)
        setNewName('')
      }

      return React.createElement('div', {
        className: 'dsorgc-backdrop',
        onClick: () => { closeMove(); setNewName('') },
      },
        React.createElement('div', {
          className: 'dsorgc-card',
          onClick: (e) => e.stopPropagation(),
        },
          React.createElement('div', { className: 'dsorgc-head' },
            React.createElement('span', { className: 'dsorgc-title' }, '移动到文件夹'),
            React.createElement('button', { type: 'button', className: 'dsorgc-iconbtn', title: '关闭', onClick: () => { closeMove(); setNewName('') } },
              React.createElement(Icon, { d: IC_CLOSE, size: 13 }))),
          React.createElement('div', { className: 'dsorgc-sub' }, title),
          React.createElement('div', { className: 'dsorgc-list' },
            folders.length === 0 ? React.createElement('div', { className: 'dsorgc-empty' }, '还没有文件夹，下面新建一个') : null,
            folders.map((f) => React.createElement('div', {
              key: f.id, className: 'dsorgc-row', onClick: () => pick(f.id),
            },
              React.createElement(Icon, { d: IC_FOLDER, size: 13 }),
              React.createElement('span', { className: 'dsorgc-grow' }, f.name),
              current === f.id ? React.createElement(Icon, { d: IC_CHECK, size: 13 }) : null,
            )),
            React.createElement('div', { className: 'dsorgc-row', onClick: () => pick(null) },
              React.createElement('span', { className: 'dsorgc-none' }, '未分类'),
              !current ? React.createElement(Icon, { d: IC_CHECK, size: 13 }) : null,
            )),
          React.createElement('div', { className: 'dsorgc-newrow' },
            React.createElement('input', {
              className: 'dsorgc-input', placeholder: '新建文件夹…', value: newName,
              onChange: (e) => setNewName(e.target.value),
              onKeyDown: (e) => { if (e.key === 'Enter') add() },
            }),
            React.createElement('button', { type: 'button', className: 'dsorgc-btn', onClick: add, disabled: newName.trim() === '' }, '添加'),
          ),
        ))
    }

    // ==================== 组件：管理弹窗 ====================

    /** 管理弹窗：按工作区列出文件夹；重命名/删除/新建；展开查看并打开会话。 */
    function ManageDialog({ useManageOpen, useFolders, closeManage, renameFolder, deleteFolder, createFolder, assignSession, getSessions, getWorkspaces, openSession }) {
      const open = useManageOpen()
      const data = useFolders()
      const [creating, setCreating] = React.useState(null)   // 正在内联新建的工作区 id
      const [newName, setNewName] = React.useState('')
      const [editing, setEditing] = React.useState(null)     // 正在内联改名的文件夹 id
      const [editName, setEditName] = React.useState('')
      const [expanded, setExpanded] = React.useState({})
      if (!open) return null

      const sessionsSnap = getSessions()
      const byId = sessionsSnap && sessionsSnap.byId ? sessionsSnap.byId : {}
      const wsTitles = {}
      const wsList = getWorkspaces()
      if (Array.isArray(wsList)) wsList.forEach((w) => { wsTitles[w.workspaceId] = w.title || w.workspaceId })

      // 按工作区分组（保持数据中的出现顺序）
      const byWs = new Map()
      ;(data.folders || []).forEach((f) => {
        if (!byWs.has(f.workspaceId)) byWs.set(f.workspaceId, [])
        byWs.get(f.workspaceId).push(f)
      })

      const close = () => { closeManage(); setCreating(null); setEditing(null); setNewName(''); setEditName('') }
      const sessionsOf = (fid) => Object.keys(data.assign).filter((sid) => data.assign[sid] === fid)

      return React.createElement('div', { className: 'dsorgc-backdrop', onClick: close },
        React.createElement('div', { className: 'dsorgc-card dsorgc-wide', onClick: (e) => e.stopPropagation() },
          React.createElement('div', { className: 'dsorgc-head' },
            React.createElement('span', { className: 'dsorgc-title' }, '会话文件夹管理'),
            React.createElement('button', { type: 'button', className: 'dsorgc-iconbtn', title: '关闭', onClick: close },
              React.createElement(Icon, { d: IC_CLOSE, size: 13 }))),
          React.createElement('div', { className: 'dsorgc-list' },
            byWs.size === 0 ? React.createElement('div', { className: 'dsorgc-empty' }, '还没有文件夹') : null,
            Array.from(byWs.entries()).map(([wsId, folders]) => React.createElement('div', { key: wsId || 'none', className: 'dsorgc-ws' },
              React.createElement('div', { className: 'dsorgc-wshead' },
                React.createElement('span', { className: 'dsorgc-wstitle' }, wsTitles[wsId] || wsId || '（未知工作区）'),
                React.createElement('button', {
                  type: 'button', className: 'dsorgc-iconbtn', title: '在此工作区新建文件夹',
                  onClick: () => { setCreating(wsId); setNewName('') },
                }, React.createElement(Icon, { d: IC_PLUS, size: 12 }))),
              creating === wsId ? React.createElement('div', { className: 'dsorgc-newrow' },
                React.createElement('input', {
                  className: 'dsorgc-input', autoFocus: true, placeholder: '文件夹名称', value: newName,
                  onChange: (e) => setNewName(e.target.value),
                  onKeyDown: (e) => {
                    if (e.key === 'Enter' && newName.trim() !== '') { createFolder(wsId, newName.trim()); setCreating(null); setNewName('') }
                    if (e.key === 'Escape') { setCreating(null); setNewName('') }
                  },
                }),
                React.createElement('button', { type: 'button', className: 'dsorgc-iconbtn', title: '确定', onClick: () => { if (newName.trim() !== '') { createFolder(wsId, newName.trim()); setCreating(null); setNewName('') } } },
                  React.createElement(Icon, { d: IC_CHECK, size: 12 })),
              ) : null,
              folders.map((f) => {
                const members = sessionsOf(f.id)
                const isOpen = !!expanded[f.id]
                return React.createElement('div', { key: f.id },
                  React.createElement('div', { className: 'dsorgc-row' },
                    React.createElement('button', {
                      type: 'button', className: 'dsorgc-iconbtn', title: isOpen ? '收起' : '展开',
                      onClick: () => setExpanded((prev) => Object.assign({}, prev, { [f.id]: !prev[f.id] })),
                    }, React.createElement(Icon, { d: IC_FOLDER, size: 13 })),
                    editing === f.id ? React.createElement('input', {
                      className: 'dsorgc-input dsorgc-grow', autoFocus: true, value: editName,
                      onChange: (e) => setEditName(e.target.value),
                      onKeyDown: (e) => {
                        if (e.key === 'Enter' && editName.trim() !== '') { renameFolder(f.id, editName.trim()); setEditing(null) }
                        if (e.key === 'Escape') setEditing(null)
                      },
                    }) : React.createElement('span', {
                      className: 'dsorgc-grow', title: '双击重命名',
                      onDoubleClick: () => { setEditing(f.id); setEditName(f.name) },
                    }, f.name + '（' + members.length + '）'),
                    React.createElement('button', { type: 'button', className: 'dsorgc-iconbtn', title: '重命名', onClick: () => { setEditing(f.id); setEditName(f.name) } },
                      React.createElement(Icon, { d: IC_PENCIL, size: 12 })),
                    React.createElement('button', { type: 'button', className: 'dsorgc-iconbtn', title: '删除（级联子文件夹）', onClick: () => deleteFolder(f.id) },
                      React.createElement(Icon, { d: IC_TRASH, size: 12 })),
                  ),
                  isOpen ? React.createElement('div', { className: 'dsorgc-members' },
                    members.length === 0 ? React.createElement('div', { className: 'dsorgc-empty' }, '（空）') : null,
                    members.map((sid) => {
                      const meta = byId[sid]
                      return React.createElement('div', {
                        key: sid, className: 'dsorgc-row dsorgc-member',
                        onClick: () => { openSession(sid); close() },
                        title: meta ? undefined : '会话详情未加载，点击尝试打开',
                      },
                        React.createElement('span', { className: 'dsorgc-grow' }, (meta && meta.displayTitle) || sid),
                        React.createElement('button', {
                          type: 'button', className: 'dsorgc-iconbtn', title: '移出文件夹',
                          onClick: (e) => { e.stopPropagation(); assignSession(sid, null) },
                        }, React.createElement(Icon, { d: IC_CLOSE, size: 11 })),
                      )
                    }),
                  ) : null,
                )
              }),
            ))),
          React.createElement('div', { className: 'dsorgc-sub' }, '提示：双击文件夹名重命名；把会话加入文件夹用会话菜单里的「移动到文件夹」。'),
        ))
    }

    // ==================== 组件：侧栏底部管理按钮 ====================

    /** 侧栏底部按钮：打开管理弹窗。 */
    function ManageButton({ openManage }) {
      return React.createElement('button', {
        type: 'button', className: 'dsorgc-iconbtn', title: '会话文件夹', 'aria-label': '会话文件夹',
        onClick: () => openManage(),
      }, React.createElement(Icon, { d: IC_FOLDER, size: 15 }))
    }

    // ==================== 样式 ====================

    const CSS = [
      '.dsorgc-mi{display:flex;align-items:center;gap:8px;width:100%;padding:6px 8px;background:none;border:none;cursor:pointer;font-size:13px;line-height:20px;color:inherit;text-align:left;border-radius:6px}',
      '.dsorgc-mi:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.15))}',
      '.dsorgc-mi-icon{display:inline-flex;justify-content:center;align-items:center;width:14px;height:14px;flex:none}',
      '.dsorgc-tag{display:inline-flex;align-items:center;gap:4px;max-width:110px;height:16px;padding:0 6px;border:1px solid;border-radius:4px;font-size:10px;line-height:14px;overflow:hidden;flex:none}',
      '.dsorgc-tagdot{width:5px;height:5px;border-radius:50%;flex:none}',
      '.dsorgc-tagname{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsorgc-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1300;display:flex;align-items:center;justify-content:center}',
      '.dsorgc-card{background:var(--dsw-specific-menu,#fff);color:var(--dsw-alias-label-primary,inherit);border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.25);width:380px;max-width:92vw;max-height:72vh;display:flex;flex-direction:column;padding:14px;gap:8px}',
      '.dsorgc-card.dsorgc-wide{width:520px}',
      '.dsorgc-head{display:flex;align-items:center;justify-content:space-between;gap:8px}',
      '.dsorgc-title{font-size:14px;font-weight:600}',
      '.dsorgc-sub{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary,#888);word-break:break-all}',
      '.dsorgc-list{overflow-y:auto;min-height:0;display:flex;flex-direction:column;gap:2px}',
      '.dsorgc-row{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;font-size:13px;line-height:20px}',
      '.dsorgc-row:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12))}',
      '.dsorgc-member{padding-left:22px}',
      '.dsorgc-grow{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsorgc-none{flex:1;color:var(--dsw-alias-label-tertiary,#888)}',
      '.dsorgc-empty{padding:6px 8px;font-size:12px;color:var(--dsw-alias-label-tertiary,#888)}',
      '.dsorgc-newrow{display:flex;align-items:center;gap:6px;padding:2px 0}',
      '.dsorgc-input{flex:1;min-width:0;padding:5px 8px;font-size:13px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.4));border-radius:6px;background:transparent;color:inherit}',
      '.dsorgc-btn{padding:5px 10px;font-size:12px;border:none;border-radius:6px;cursor:pointer;background:var(--dsw-static-deepseek-500,#4d6bfe);color:#fff}',
      '.dsorgc-btn:disabled{opacity:.4;cursor:default}',
      '.dsorgc-iconbtn{display:inline-flex;justify-content:center;align-items:center;width:22px;height:22px;padding:0;border:none;border-radius:5px;background:none;color:inherit;cursor:pointer;flex:none}',
      '.dsorgc-iconbtn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.15))}',
      '.dsorgc-ws{display:flex;flex-direction:column;gap:2px}',
      '.dsorgc-wshead{display:flex;align-items:center;justify-content:space-between;padding:4px 4px 2px}',
      '.dsorgc-wstitle{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#666)}',
      '.dsorgc-members{display:flex;flex-direction:column;gap:1px}',
    ].join('\n')

    // ==================== 插件注册 ====================

    return {
      name: 'session-organizer',
      inject: ['slots'],
      apply(ctx) {
        // 注入样式（卸载时移除）
        const style = document.createElement('style')
        style.setAttribute('data-dsh-dsorg-css', '')
        style.textContent = CSS
        document.head.appendChild(style)
        ctx.effect(() => () => { style.remove() }, 'dshorg: css')

        const slots = ctx.get('slots')
        if (slots === undefined) return

        // 惰性服务访问器（cordis 嵌套服务/未就绪服务必须 ctx.get，不能直接属性访问）
        const getSessions = () => { try { const s = ctx.get('sessions'); return s && s.list ? s.list.getSnapshot() : null } catch (err) { return null } }
        const getWorkspaces = () => { try { const w = ctx.get('workspaces'); return w && w.list ? w.list.getSnapshot() : [] } catch (err) { return [] } }
        const openSession = (sessionId) => {
          try { const ui = ctx.get('uiWorkspace'); if (ui && typeof ui.openSession === 'function') ui.openSession(sessionId) } catch (err) { console.error('dshorg: 打开会话失败', err) }
        }

        // 启动即拉取一次文件夹数据
        loadFolders()

        // 1. 会话"..."菜单项：移动到文件夹
        slots.inject('sidebar.workspaces.session.menu.item', function* () {
          yield slots.register({
            name: 'sidebar.workspaces.session.menu.item',
            id: 'dsorg-move',
            order: MENU_ORDER,
            inject: () => ({
              requestMove: (sessionId, displayTitle) => moveRequest.set({ sessionId, displayTitle }),
            }),
          }, MoveMenuItem)
        })

        // 2. 会话行首文件夹标签
        slots.inject('sidebar.session.row.leading', function* () {
          yield slots.register({
            name: 'sidebar.session.row.leading',
            id: 'dsorg-badge',
            inject: () => ({ useFolders }),
          }, FolderTag)
        })

        // 3. 全局弹层：移动弹窗 + 管理弹窗
        slots.inject('shell.overlay', function* () {
          yield slots.register({
            name: 'shell.overlay',
            id: 'dsorg-move-dialog',
            inject: () => ({
              useMoveRequest, useFolders, assignSession, createFolder,
              getSessions, getWorkspaces,
              closeMove: () => moveRequest.set(null),
            }),
          }, MoveDialog)
          yield slots.register({
            name: 'shell.overlay',
            id: 'dsorg-manage-dialog',
            inject: () => ({
              useManageOpen, useFolders, renameFolder, deleteFolder, createFolder, assignSession,
              closeManage: () => manageOpen.set(false),
              getSessions, getWorkspaces, openSession,
            }),
          }, ManageDialog)
        })

        // 4. 侧栏底部按钮：打开管理弹窗
        slots.inject('sidebar.footer.action', function* () {
          yield slots.register({
            name: 'sidebar.footer.action',
            id: 'dsorg-manage-btn',
            inject: () => ({ openManage: () => manageOpen.set(true) }),
          }, ManageButton)
        })
      },
    }
  },
})

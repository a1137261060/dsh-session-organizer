/**
 * dsh-session-organizer — host 半。
 *
 * 提供侧边栏两级分类（工作区分组 + 会话文件夹）的磁盘持久化路由：
 *
 *   POST /api/dshorg/groups          读取/保存工作区分组配置
 *   POST /api/dshorg/session-folders 读取/保存会话文件夹配置
 *
 * 路由仅限 loopback（浏览器同源信任围栏），读取 JSON body、返回 JSON。
 * 数据持久化到 ~/.dsh/dshorg-groups.json 与 ~/.dsh/dshorg-session-folders.json，
 * 原子写（tmp + rename），换浏览器/清缓存/重启后配置不丢。
 * 零第三方运行时依赖。
 */
import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** 稳定的 cordis 插件名。 */
export const name = 'session-organizer'

/** 挂载路由前需要的服务。 */
export const inject = ['webServer']

/** JSON body 大小上限（分组/文件夹配置都很小）。 */
const MAX_JSON_BODY_BYTES = 512 * 1024

/** IPv4 127/8 判定（四个十进制段，首段为 127）。 */
function isIPv4Loopback(v4) {
  const parts = v4.split('.')
  return parts.length === 4 && parts[0] === '127'
    && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)
}

/** socket 远端地址是否属于 loopback 段。 */
function isLoopbackAddress(address) {
  if (address === undefined) return false
  const normalized = address.toLowerCase()
  if (normalized === '::1') return true
  if (normalized.startsWith('::ffff:')) return isIPv4Loopback(normalized.slice('::ffff:'.length))
  return isIPv4Loopback(normalized)
}

/** 规范化的 URL hostname 是否属于 loopback 权威域。 */
function isLoopbackHostname(hostname) {
  if (hostname === 'localhost' || hostname === '[::1]') return true
  return isIPv4Loopback(hostname)
}

/** 请求级信任围栏：loopback socket + Host 头 + 同源标记。 */
function isLoopbackRequest(request) {
  if (!isLoopbackAddress(request.socket.remoteAddress)) return false
  const host = request.headers.host
  if (typeof host !== 'string') return false
  let hostUrl
  try {
    hostUrl = new URL('http://' + host)
  } catch {
    return false
  }
  if (!isLoopbackHostname(hostUrl.hostname)) return false
  if (request.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = request.headers.origin
  if (origin === undefined) return true
  try {
    return new URL(origin).host === hostUrl.host
  } catch {
    return false
  }
}

/** 输出一条 JSON 响应。 */
function writeJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'referrer-policy': 'no-referrer' })
  res.end(payload)
}

/** 读取 JSON 请求体（过大或不可解析时返回 undefined）。 */
async function readJsonBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    const buffer = chunk
    size += buffer.length
    if (size > MAX_JSON_BODY_BYTES) return undefined
    chunks.push(buffer)
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    return typeof parsed === 'object' && parsed !== null ? parsed : undefined
  } catch {
    return undefined
  }
}

/** 通用磁盘 JSON 存储（惰性加载 + 原子写）。 */
function makeDiskStore(filename) {
  let data = null
  let path = ''
  const filePath = () => {
    if (path !== '') return path
    const home = process.env.USERPROFILE || process.env.HOME || ''
    if (!home) return ''
    path = join(home, '.dsh', filename)
    return path
  }
  const load = () => {
    const p = filePath()
    if (!p) return
    try {
      const raw = readFileSync(p, 'utf8')
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') data = parsed
    } catch {
      data = null // 首次运行 / 文件不存在
    }
  }
  const save = (value) => {
    const p = filePath()
    if (!p) return
    data = value
    try {
      const tmp = p + '.tmp-' + process.pid
      writeFileSync(tmp, JSON.stringify(value), 'utf8')
      renameSync(tmp, p)
    } catch (err) {
      console.error('dshorg: ' + filename + ' 写入失败', err)
    }
  }
  load()
  return { filePath, load, save, get: () => data }
}

/**
 * 挂载 /api/dshorg 路由。
 * @param ctx - host 插件上下文（携带 webServer）。
 */
export function apply(ctx) {
  const webServer = ctx.get('webServer')
  if (webServer === undefined) return

  const groupStore = makeDiskStore('dshorg-groups.json')
  const folderStore = makeDiskStore('dshorg-session-folders.json')

  const routes = [
    {
      kind: 'exact',
      path: '/api/dshorg/groups',
      handler: async (req, res) => {
        if (!isLoopbackRequest(req)) return writeJson(res, 403, { error: 'forbidden: loopback-only' })
        const body = await readJsonBody(req)
        if (body && body.save === true) {
          const data = body.data && typeof body.data === 'object' ? body.data : null
          if (data === null) return writeJson(res, 400, { error: 'invalid data' })
          groupStore.save(data)
          writeJson(res, 200, { ok: true })
          return
        }
        writeJson(res, 200, groupStore.get() ?? null)
      },
    },
    {
      kind: 'exact',
      path: '/api/dshorg/session-folders',
      handler: async (req, res) => {
        if (!isLoopbackRequest(req)) return writeJson(res, 403, { error: 'forbidden: loopback-only' })
        const body = await readJsonBody(req)
        if (body && body.save === true) {
          const data = body.data && typeof body.data === 'object' ? body.data : null
          if (data === null) return writeJson(res, 400, { error: 'invalid data' })
          folderStore.save(data)
          writeJson(res, 200, { ok: true })
          return
        }
        writeJson(res, 200, folderStore.get() ?? null)
      },
    },
  ]

  const disposers = routes.map((route) => webServer.register(route))
  ctx.effect(() => () => { for (const d of disposers) d() }, 'dshorg: routes')
}
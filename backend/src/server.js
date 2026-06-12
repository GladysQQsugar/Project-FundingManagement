import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { signToken, requireAuth, requireAdmin } from './auth.js'
import { verifyPassword } from './password.js'
import { findUserByUsername, getSetting, initializeStorage, listProjects, replaceProjects, setSetting } from './storage.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()

app.use(express.json({ limit: '20mb' }))

if (process.env.NODE_ENV !== 'production') {
  app.use(cors())
}

const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  role: user.role
})

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const username = String(req.body?.username || '').trim()
    const password = String(req.body?.password || '')
    if (!username || !password) return res.status(400).json({ message: '请输入账号和密码' })

    const user = await findUserByUsername(username)
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ message: '账号或密码错误' })
    }

    res.json({ token: signToken(user), user: publicUser(user) })
  } catch (err) {
    next(err)
  }
})

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

app.get('/api/projects', requireAuth, async (req, res, next) => {
  try {
    res.json({ projects: await listProjects() })
  } catch (err) {
    next(err)
  }
})

app.put('/api/projects/bulk', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const projects = Array.isArray(req.body?.projects) ? req.body.projects : []
    const count = await replaceProjects(projects)
    res.json({ ok: true, count })
  } catch (err) {
    next(err)
  }
})

app.get('/api/settings/:key', requireAuth, async (req, res, next) => {
  try {
    res.json({ value: await getSetting(req.params.key) })
  } catch (err) {
    next(err)
  }
})

app.put('/api/settings/:key', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await setSetting(req.params.key, req.body?.value ?? null)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

const frontendDist = path.resolve(__dirname, process.env.FRONTEND_DIST || '../../dist')
app.use(express.static(frontendDist))
app.use('/api', (req, res) => {
  res.status(404).json({ message: '接口不存在' })
})
app.get('*', (req, res, next) => {
  res.sendFile(path.join(frontendDist, 'index.html'))
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: err.message || '服务器内部错误' })
})

const host = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT || 3001)

await initializeStorage()

app.listen(port, host, () => {
  console.log(`Funding Management server listening on http://${host}:${port}`)
})

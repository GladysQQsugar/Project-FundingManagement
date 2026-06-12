import { createHmac, timingSafeEqual } from 'node:crypto'
import { findUserById } from './storage.js'

const base64url = (input) => Buffer.from(input).toString('base64url')

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set to at least 32 characters')
  }
  return secret
}

export function signToken(user) {
  const now = Math.floor(Date.now() / 1000)
  const expiresHours = Number(process.env.JWT_EXPIRES_HOURS || 12)
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    iat: now,
    exp: now + expiresHours * 60 * 60
  }
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`
  const signature = createHmac('sha256', getJwtSecret()).update(unsigned).digest('base64url')
  return `${unsigned}.${signature}`
}

export function verifyToken(token) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) return null
  const [header, payload, signature] = parts
  const unsigned = `${header}.${payload}`
  const expected = createHmac('sha256', getJwtSecret()).update(unsigned).digest('base64url')
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null

  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) return null
  return decoded
}

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    const payload = verifyToken(token)
    if (!payload) return res.status(401).json({ message: '请先登录' })

    const user = await findUserById(payload.sub)
    if (!user) return res.status(401).json({ message: '账号不存在或已停用' })
    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: '访客账号只有查看和导出权限' })
  }
  next()
}

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureSchema, pool } from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataFile = path.resolve(__dirname, '../data/dev-store.json')
const driver = process.env.STORAGE_DRIVER || 'mysql'

const parseJsonValue = (value, fallback) => {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const defaultStore = () => ({
  users: [],
  projects: [],
  settings: {}
})

async function readFileStore() {
  try {
    const raw = await fs.readFile(dataFile, 'utf8')
    return { ...defaultStore(), ...JSON.parse(raw) }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
    return defaultStore()
  }
}

async function writeFileStore(store) {
  await fs.mkdir(path.dirname(dataFile), { recursive: true })
  await fs.writeFile(dataFile, JSON.stringify(store, null, 2), 'utf8')
}

export function isFileStorage() {
  return driver === 'file'
}

export async function initializeStorage() {
  if (isFileStorage()) {
    await writeFileStore(await readFileStore())
    return
  }
  await ensureSchema()
}

export async function closeStorage() {
  if (!isFileStorage()) await pool.end()
}

export async function findUserByUsername(username) {
  if (isFileStorage()) {
    const store = await readFileStore()
    return store.users.find(user => user.username === username) || null
  }
  const [rows] = await pool.query('SELECT id, username, password_hash, role FROM users WHERE username = ?', [username])
  return rows[0] || null
}

export async function findUserById(id) {
  if (isFileStorage()) {
    const store = await readFileStore()
    const user = store.users.find(item => Number(item.id) === Number(id))
    return user ? { id: user.id, username: user.username, role: user.role } : null
  }
  const [rows] = await pool.query('SELECT id, username, role FROM users WHERE id = ?', [id])
  return rows[0] || null
}

export async function upsertUser({ username, passwordHash, role }) {
  if (isFileStorage()) {
    const store = await readFileStore()
    const existing = store.users.find(user => user.username === username)
    if (existing) {
      existing.password_hash = passwordHash
      existing.role = role
    } else {
      const nextId = store.users.length ? Math.max(...store.users.map(user => Number(user.id) || 0)) + 1 : 1
      store.users.push({ id: nextId, username, password_hash: passwordHash, role })
    }
    await writeFileStore(store)
    return
  }
  await pool.query(
    `INSERT INTO users (username, password_hash, role)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role)`,
    [username, passwordHash, role]
  )
}

export async function listProjects() {
  if (isFileStorage()) {
    const store = await readFileStore()
    return store.projects
  }
  const [rows] = await pool.query('SELECT id, data FROM projects ORDER BY id DESC')
  return rows.map((row) => {
    const data = parseJsonValue(row.data, {})
    return { ...data, id: data.id || row.id }
  })
}

export async function replaceProjects(projects) {
  if (isFileStorage()) {
    const store = await readFileStore()
    store.projects = projects
      .map(project => ({ ...project, id: Number(project.id) }))
      .filter(project => Number.isInteger(project.id) && project.id > 0)
    await writeFileStore(store)
    return store.projects.length
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await connection.query('DELETE FROM projects')
    let count = 0
    for (const project of projects) {
      const id = Number(project.id)
      if (!Number.isInteger(id) || id <= 0) continue
      await connection.query(
        'INSERT INTO projects (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
        [id, JSON.stringify({ ...project, id })]
      )
      count++
    }
    await connection.commit()
    return count
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
  }
}

export async function getSetting(key) {
  if (isFileStorage()) {
    const store = await readFileStore()
    return store.settings[key] ?? null
  }
  const [rows] = await pool.query('SELECT setting_value FROM app_settings WHERE setting_key = ?', [key])
  return rows.length ? parseJsonValue(rows[0].setting_value, null) : null
}

export async function setSetting(key, value) {
  if (isFileStorage()) {
    const store = await readFileStore()
    store.settings[key] = value
    await writeFileStore(store)
    return
  }
  await pool.query(
    'INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
    [key, JSON.stringify(value ?? null)]
  )
}

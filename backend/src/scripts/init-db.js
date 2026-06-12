import 'dotenv/config'
import { hashPassword } from '../password.js'
import { closeStorage, initializeStorage, upsertUser } from '../storage.js'

const users = [
  {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD,
    role: 'admin'
  },
  {
    username: process.env.VISITOR_USERNAME || 'visitor',
    password: process.env.VISITOR_PASSWORD,
    role: 'visitor'
  }
]

for (const user of users) {
  if (!user.password || user.password.length < 8) {
    throw new Error(`${user.role} password must be set in .env and contain at least 8 characters`)
  }
}

await initializeStorage()

for (const user of users) {
  await upsertUser({ username: user.username, passwordHash: hashPassword(user.password), role: user.role })
  console.log(`User ready: ${user.username} (${user.role})`)
}

await closeStorage()
console.log('Database initialized.')

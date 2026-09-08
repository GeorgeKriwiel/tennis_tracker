import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pool } from './db'

async function migrate() {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')
  const statements = sql.split(';').map((s) => s.trim()).filter(Boolean)

  for (const statement of statements) {
    await pool.query(statement)
  }

  console.log('Migration complete')
  await pool.end()
}

migrate().catch((err) => {
  console.error(err)
  process.exit(1)
})

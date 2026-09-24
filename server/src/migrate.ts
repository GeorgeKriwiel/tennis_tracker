import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pool } from './db'

async function migrate() {
  // Run the whole file as one multi-statement query (needed for the DO block).
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')
  await pool.query(sql)

  console.log('Migration complete')
  await pool.end()
}

migrate().catch((err) => {
  console.error(err)
  process.exit(1)
})

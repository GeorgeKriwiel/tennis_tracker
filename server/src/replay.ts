import 'dotenv/config'
import { pool } from './db'
import { replayRatings } from './ratings'

// Rebuilds every rating from the match history with the current scoring rules
// (see ratings.ts) and prints each player's before → after. Dry run by default —
// the rebuild happens in a transaction that is rolled back; pass --apply to commit.
async function main() {
  const apply = process.argv.includes('--apply')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: before } = await client.query<{ id: number; name: string; elo: number }>(
      'SELECT id, name, elo FROM players',
    )
    await replayRatings(client)
    const { rows: after } = await client.query<{ id: number; elo: number }>(
      'SELECT id, elo FROM players',
    )
    const afterById = new Map(after.map((p) => [p.id, p.elo]))

    const rows = before
      .map((p) => ({ name: p.name, before: p.elo, after: afterById.get(p.id)! }))
      .sort((a, b) => b.after - a.after)
    for (const r of rows) {
      const diff = r.after - r.before
      console.log(
        `${r.name.padEnd(20)} ${r.before.toFixed(2).padStart(8)} → ${r.after.toFixed(2).padStart(8)}  (${diff >= 0 ? '+' : ''}${diff.toFixed(2)})`,
      )
    }

    if (apply) {
      await client.query('COMMIT')
      console.log(`\nApplied: ${rows.length} players' ratings rebuilt.`)
    } else {
      await client.query('ROLLBACK')
      console.log('\nDry run — nothing changed. Re-run with --apply to save.')
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

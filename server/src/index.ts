import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { pool } from './db'
import { scoreMatch } from './elo'
import { requireAdminPasscode } from './adminAuth'
import { parseMatchInput, winnerOf } from './matchInput'
import { replayRatings } from './ratings'

const app = express()
app.set('trust proxy', 1)
app.use(cors())
app.use(express.json())

interface Player {
  id: number
  name: string
  elo: number
}

app.get('/api/players', async (_req, res) => {
  const { rows } = await pool.query<Player>(
    'SELECT id, name, elo FROM players ORDER BY elo DESC',
  )
  res.json(rows)
})

app.post('/api/players', async (req, res) => {
  const { name } = req.body as { name?: string }
  if (!name?.trim()) {
    res.status(400).json({ error: 'name is required' })
    return
  }

  try {
    const { rows } = await pool.query<{ id: number }>(
      'INSERT INTO players (name) VALUES ($1) RETURNING id',
      [name.trim()],
    )
    res.status(201).json({ id: rows[0].id, name: name.trim(), elo: 1200 })
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === '23505') {
      res.status(409).json({ error: 'a player with that name already exists' })
      return
    }
    throw err
  }
})

app.delete('/api/players/:id', requireAdminPasscode, async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'invalid player id' })
    return
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rowCount } = await client.query('SELECT 1 FROM players WHERE id = $1', [id])
    if (!rowCount) {
      await client.query('ROLLBACK')
      res.status(404).json({ error: 'player not found' })
      return
    }

    // Removing a player removes their matches too; since ELO is a running
    // total, everyone's ratings are then rebuilt from the remaining matches.
    await client.query('DELETE FROM matches WHERE player_a_id = $1 OR player_b_id = $1', [id])
    await client.query('DELETE FROM players WHERE id = $1', [id])
    await replayRatings(client)

    await client.query('COMMIT')
    res.status(204).end()
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

app.get('/api/matches', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT m.id, m.played_on, m.score_a, m.score_b, m.match_type, m.park, m.notes, m.winner_id,
            m.player_a_elo_after, m.player_b_elo_after,
            pa.id AS player_a_id, pa.name AS player_a_name,
            pb.id AS player_b_id, pb.name AS player_b_name
     FROM matches m
     JOIN players pa ON pa.id = m.player_a_id
     JOIN players pb ON pb.id = m.player_b_id
     ORDER BY m.played_on DESC, m.id DESC`,
  )
  res.json(rows)
})

app.post('/api/matches', async (req, res) => {
  const parsed = parseMatchInput(req.body)
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error })
    return
  }
  const { playedOn, playerAId, playerBId, gamesA, gamesB, matchType, park, notes } = parsed.value

  // Winner and draw come from scoreMatch; a draw is stored as winner_id NULL.
  const { scoreA: result } = scoreMatch(gamesA, gamesB, matchType)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows: players } = await client.query<Player>(
      'SELECT id, name, elo FROM players WHERE id IN ($1, $2)',
      [playerAId, playerBId],
    )
    const playerA = players.find((p) => p.id === playerAId)
    const playerB = players.find((p) => p.id === playerBId)
    if (!playerA || !playerB) {
      await client.query('ROLLBACK')
      res.status(404).json({ error: 'player not found' })
      return
    }
    const winnerId = winnerOf(result, playerA.id, playerB.id)

    // The ELO columns get placeholder values here; replayRatings fills in the real ones.
    // A match can be backdated before matches already logged, so every rating after it
    // may change — the whole history is replayed in played order, not just these two.
    const { rows: inserted } = await client.query<{ id: number }>(
      `INSERT INTO matches
        (played_on, player_a_id, player_b_id, score_a, score_b, match_type, winner_id, player_a_elo_after, player_b_elo_after, park, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [playedOn, playerA.id, playerB.id, gamesA, gamesB, matchType, winnerId, playerA.elo, playerB.elo, park, notes],
    )
    await replayRatings(client)
    const { rows: after } = await client.query<{ a: number; b: number }>(
      'SELECT player_a_elo_after AS a, player_b_elo_after AS b FROM matches WHERE id = $1',
      [inserted[0].id],
    )

    await client.query('COMMIT')

    res.status(201).json({
      id: inserted[0].id,
      playedOn,
      playerA: { id: playerA.id, name: playerA.name, eloAfter: after[0].a },
      playerB: { id: playerB.id, name: playerB.name, eloAfter: after[0].b },
      scoreA: gamesA,
      scoreB: gamesB,
      matchType,
      winnerId,
      park,
      notes,
    })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

// Editing a match can change anything about it, and ratings are a running total, so
// every rating is rebuilt afterwards. Changing its date moves it to its new place in the
// rating order (played order). Passcode-protected like removing a player.
app.put('/api/matches/:id', requireAdminPasscode, async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'invalid match id' })
    return
  }
  const parsed = parseMatchInput(req.body)
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error })
    return
  }
  const { playedOn, playerAId, playerBId, gamesA, gamesB, matchType, park, notes } = parsed.value

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rowCount: matchExists } = await client.query('SELECT 1 FROM matches WHERE id = $1', [id])
    if (!matchExists) {
      await client.query('ROLLBACK')
      res.status(404).json({ error: 'match not found' })
      return
    }
    const { rowCount: playerCount } = await client.query(
      'SELECT 1 FROM players WHERE id IN ($1, $2)',
      [playerAId, playerBId],
    )
    if (playerCount !== 2) {
      await client.query('ROLLBACK')
      res.status(404).json({ error: 'player not found' })
      return
    }

    const { scoreA: result } = scoreMatch(gamesA, gamesB, matchType)
    await client.query(
      `UPDATE matches
       SET played_on = $1, player_a_id = $2, player_b_id = $3, score_a = $4, score_b = $5,
           match_type = $6, winner_id = $7, park = $8, notes = $9
       WHERE id = $10`,
      [playedOn, playerAId, playerBId, gamesA, gamesB, matchType, winnerOf(result, playerAId, playerBId), park, notes, id],
    )
    await replayRatings(client)

    await client.query('COMMIT')
    res.status(204).end()
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

// Deleting a match removes it from the rating history, so every rating is rebuilt from the
// remaining matches. Passcode-protected like editing.
app.delete('/api/matches/:id', requireAdminPasscode, async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'invalid match id' })
    return
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rowCount } = await client.query('DELETE FROM matches WHERE id = $1', [id])
    if (!rowCount) {
      await client.query('ROLLBACK')
      res.status(404).json({ error: 'match not found' })
      return
    }
    await replayRatings(client)

    await client.query('COMMIT')
    res.status(204).end()
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'internal server error' })
})

const port = process.env.PORT ?? 3001
app.listen(port, () => console.log(`API listening on port ${port}`))

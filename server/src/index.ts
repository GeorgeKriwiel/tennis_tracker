import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { pool } from './db'
import { computeEloUpdate, scoreMatch } from './elo'
import { replayRatings } from './ratings'

const app = express()
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

app.delete('/api/players/:id', async (req, res) => {
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
    `SELECT m.id, m.played_on, m.score_a, m.score_b, m.notes, m.winner_id,
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
  const {
    playedOn,
    playerAId,
    playerBId,
    scoreA: gamesA,
    scoreB: gamesB,
    notes,
  } = req.body as {
    playedOn?: string
    playerAId?: number
    playerBId?: number
    scoreA?: number
    scoreB?: number
    notes?: string
  }

  const validScore = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0
  if (!playedOn || !playerAId || !playerBId || !validScore(gamesA) || !validScore(gamesB)) {
    res.status(400).json({
      error: 'playedOn, playerAId, playerBId, scoreA, scoreB (whole numbers >= 0) are required',
    })
    return
  }
  if (gamesA === 0 && gamesB === 0) {
    res.status(400).json({ error: 'enter a score' })
    return
  }
  if (playerAId === playerBId) {
    res.status(400).json({ error: 'playerAId and playerBId must differ' })
    return
  }

  const { rows: players } = await pool.query<Player>(
    'SELECT id, name, elo FROM players WHERE id IN ($1, $2)',
    [playerAId, playerBId],
  )
  const playerA = players.find((p) => p.id === playerAId)
  const playerB = players.find((p) => p.id === playerBId)
  if (!playerA || !playerB) {
    res.status(404).json({ error: 'player not found' })
    return
  }

  // Winner, draw and K-scaling all come from scoreMatch; a draw is stored as
  // winner_id NULL.
  const { scoreA: result, k } = scoreMatch(gamesA, gamesB)
  const winnerId = result === 1 ? playerA.id : result === 0 ? playerB.id : null

  const { newRatingA, newRatingB } = computeEloUpdate(playerA.elo, playerB.elo, result, k)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows: inserted } = await client.query<{ id: number }>(
      `INSERT INTO matches
        (played_on, player_a_id, player_b_id, score_a, score_b, winner_id, player_a_elo_after, player_b_elo_after, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [playedOn, playerA.id, playerB.id, gamesA, gamesB, winnerId, newRatingA, newRatingB, notes ?? null],
    )
    await client.query('UPDATE players SET elo = $1 WHERE id = $2', [newRatingA, playerA.id])
    await client.query('UPDATE players SET elo = $1 WHERE id = $2', [newRatingB, playerB.id])

    await client.query('COMMIT')

    res.status(201).json({
      id: inserted[0].id,
      playedOn,
      playerA: { id: playerA.id, name: playerA.name, eloAfter: newRatingA },
      playerB: { id: playerB.id, name: playerB.name, eloAfter: newRatingB },
      scoreA: gamesA,
      scoreB: gamesB,
      winnerId,
      notes,
    })
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

import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { pool } from './db'
import { computeEloUpdate } from './elo'

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
    'SELECT id, name, elo FROM players WHERE deleted_at IS NULL ORDER BY elo DESC',
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

  const { rows: existing } = await pool.query(
    'SELECT id FROM players WHERE id = $1 AND deleted_at IS NULL',
    [id],
  )
  if (existing.length === 0) {
    res.status(404).json({ error: 'player not found' })
    return
  }

  // Players with match history can't be hard-deleted: other players' ELO was
  // computed against them. Hide them instead so history and ratings stay valid.
  const { rows: played } = await pool.query(
    'SELECT 1 FROM matches WHERE player_a_id = $1 OR player_b_id = $1 LIMIT 1',
    [id],
  )
  if (played.length === 0) {
    await pool.query('DELETE FROM players WHERE id = $1', [id])
  } else {
    await pool.query('UPDATE players SET deleted_at = NOW() WHERE id = $1', [id])
  }
  res.status(204).end()
})

app.get('/api/matches', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT m.id, m.played_on, m.sets, m.notes, m.winner_id,
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

interface SetScore {
  playerA: number
  playerB: number
}

app.post('/api/matches', async (req, res) => {
  const { playedOn, playerAId, playerBId, sets, notes } = req.body as {
    playedOn?: string
    playerAId?: number
    playerBId?: number
    sets?: SetScore[]
    notes?: string
  }

  if (!playedOn || !playerAId || !playerBId || !sets?.length) {
    res.status(400).json({ error: 'playedOn, playerAId, playerBId, sets are required' })
    return
  }
  if (playerAId === playerBId) {
    res.status(400).json({ error: 'playerAId and playerBId must differ' })
    return
  }

  const { rows: players } = await pool.query<Player>(
    'SELECT id, name, elo FROM players WHERE id IN ($1, $2) AND deleted_at IS NULL',
    [playerAId, playerBId],
  )
  const playerA = players.find((p) => p.id === playerAId)
  const playerB = players.find((p) => p.id === playerBId)
  if (!playerA || !playerB) {
    res.status(404).json({ error: 'player not found' })
    return
  }

  const setsWonByA = sets.filter((s) => s.playerA > s.playerB).length
  const setsWonByB = sets.length - setsWonByA
  const aWon = setsWonByA > setsWonByB
  const winnerId = aWon ? playerA.id : playerB.id

  const { newRatingA, newRatingB } = computeEloUpdate(playerA.elo, playerB.elo, aWon)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows: inserted } = await client.query<{ id: number }>(
      `INSERT INTO matches
        (played_on, player_a_id, player_b_id, sets, winner_id, player_a_elo_after, player_b_elo_after, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [playedOn, playerA.id, playerB.id, JSON.stringify(sets), winnerId, newRatingA, newRatingB, notes ?? null],
    )
    await client.query('UPDATE players SET elo = $1 WHERE id = $2', [newRatingA, playerA.id])
    await client.query('UPDATE players SET elo = $1 WHERE id = $2', [newRatingB, playerB.id])

    await client.query('COMMIT')

    res.status(201).json({
      id: inserted[0].id,
      playedOn,
      playerA: { id: playerA.id, name: playerA.name, eloAfter: newRatingA },
      playerB: { id: playerB.id, name: playerB.name, eloAfter: newRatingB },
      sets,
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

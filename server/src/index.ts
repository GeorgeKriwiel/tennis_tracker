import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import type { RowDataPacket } from 'mysql2'
import { pool } from './db'
import { computeEloUpdate } from './elo'

const app = express()
app.use(cors())
app.use(express.json())

interface Player extends RowDataPacket {
  id: number
  name: string
  elo: number
}

app.get('/api/players', async (_req, res) => {
  const [players] = await pool.query<Player[]>(
    'SELECT id, name, elo FROM players ORDER BY elo DESC',
  )
  res.json(players)
})

app.post('/api/players', async (req, res) => {
  const { name } = req.body as { name?: string }
  if (!name?.trim()) {
    res.status(400).json({ error: 'name is required' })
    return
  }

  const [result] = await pool.query(
    'INSERT INTO players (name) VALUES (?)',
    [name.trim()],
  )
  const insertId = (result as { insertId: number }).insertId
  res.status(201).json({ id: insertId, name: name.trim(), elo: 1200 })
})

app.get('/api/matches', async (_req, res) => {
  const [matches] = await pool.query(
    `SELECT m.id, m.played_on, m.sets, m.notes, m.winner_id,
            m.player_a_elo_after, m.player_b_elo_after,
            pa.id AS player_a_id, pa.name AS player_a_name,
            pb.id AS player_b_id, pb.name AS player_b_name
     FROM matches m
     JOIN players pa ON pa.id = m.player_a_id
     JOIN players pb ON pb.id = m.player_b_id
     ORDER BY m.played_on DESC, m.id DESC`,
  )
  res.json(matches)
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

  const [players] = await pool.query<Player[]>(
    'SELECT id, name, elo FROM players WHERE id IN (?, ?)',
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

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const [result] = await connection.query(
      `INSERT INTO matches
        (played_on, player_a_id, player_b_id, sets, winner_id, player_a_elo_after, player_b_elo_after, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [playedOn, playerA.id, playerB.id, JSON.stringify(sets), winnerId, newRatingA, newRatingB, notes ?? null],
    )
    await connection.query('UPDATE players SET elo = ? WHERE id = ?', [newRatingA, playerA.id])
    await connection.query('UPDATE players SET elo = ? WHERE id = ?', [newRatingB, playerB.id])

    await connection.commit()

    const insertId = (result as { insertId: number }).insertId
    res.status(201).json({
      id: insertId,
      playedOn,
      playerA: { id: playerA.id, name: playerA.name, eloAfter: newRatingA },
      playerB: { id: playerB.id, name: playerB.name, eloAfter: newRatingB },
      sets,
      winnerId,
      notes,
    })
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
  }
})

const port = process.env.PORT ?? 3001
app.listen(port, () => console.log(`API listening on port ${port}`))

import { createHash, timingSafeEqual } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

// Removing a player deletes their matches for good, so it needs a shared passcode
// (the ADMIN_PASSCODE env var), sent by the app in the x-admin-passcode header.
// Enforced here on the server, so calling the API directly can't skip it.
// If ADMIN_PASSCODE isn't set, removal is disabled rather than left open.

const MAX_FAILURES = 5
const LOCKOUT_MS = 15 * 60 * 1000

// Failed attempts per client IP (in memory; resets when the server restarts).
const attempts = new Map<string, { failures: number; lockedUntil: number }>()

function matches(given: string, expected: string) {
  // Hash first so the comparison is constant-time and length-independent.
  const a = createHash('sha256').update(given).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

export function requireAdminPasscode(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.ADMIN_PASSCODE
  if (!expected) {
    res.status(503).json({ error: 'removing members is disabled: no passcode is set on the server' })
    return
  }

  const key = req.ip ?? 'unknown'
  const now = Date.now()
  const record = attempts.get(key)
  if (record && record.lockedUntil > now) {
    const minutes = Math.ceil((record.lockedUntil - now) / 60000)
    res.status(429).json({ error: `too many wrong passcodes, try again in ${minutes} minute${minutes === 1 ? '' : 's'}` })
    return
  }

  const given = req.get('x-admin-passcode') ?? ''
  if (given && matches(given, expected)) {
    attempts.delete(key)
    next()
    return
  }

  // Start counting again only if a previous lockout has run out (lockedUntil 0 means "never locked").
  const lockoutExpired = record !== undefined && record.lockedUntil !== 0 && record.lockedUntil <= now
  const failures = (lockoutExpired ? 0 : (record?.failures ?? 0)) + 1
  attempts.set(key, failures >= MAX_FAILURES ? { failures: 0, lockedUntil: now + LOCKOUT_MS } : { failures, lockedUntil: 0 })
  res.status(401).json({ error: 'wrong passcode' })
}

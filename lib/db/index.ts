import { sql } from '@vercel/postgres'

// Ensure we're using the pooled connection
if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set')
}

export interface Session {
  id: string
  title: string | null
  created_at: Date
  updated_at: Date
}

export interface Message {
  id: number
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: Date
}

// Session Management
export async function createSession(sessionId: string): Promise<void> {
  await sql`
    INSERT INTO sessions (id, created_at, updated_at)
    VALUES (${sessionId}, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `
}

export async function updateSessionTitle(sessionId: string, title: string): Promise<void> {
  await sql`
    UPDATE sessions
    SET title = ${title}, updated_at = NOW()
    WHERE id = ${sessionId}
  `
}

export async function updateSessionTimestamp(sessionId: string): Promise<void> {
  await sql`
    UPDATE sessions
    SET updated_at = NOW()
    WHERE id = ${sessionId}
  `
}

export async function getSessions(limit: number = 50): Promise<Session[]> {
  const result = await sql<Session>`
    SELECT id, title, created_at, updated_at
    FROM sessions
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `
  return result.rows
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const result = await sql<Session>`
    SELECT id, title, created_at, updated_at
    FROM sessions
    WHERE id = ${sessionId}
  `
  return result.rows[0] || null
}

// Message Management
export async function saveMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  // Ensure session exists
  await createSession(sessionId)

  // Insert message
  await sql`
    INSERT INTO messages (session_id, role, content, created_at)
    VALUES (${sessionId}, ${role}, ${content}, NOW())
  `

  // Update session timestamp
  await updateSessionTimestamp(sessionId)
}

export async function getMessages(sessionId: string): Promise<Message[]> {
  const result = await sql<Message>`
    SELECT id, session_id, role, content, created_at
    FROM messages
    WHERE session_id = ${sessionId}
    ORDER BY created_at ASC
  `
  return result.rows
}

export async function getFirstTwoMessages(sessionId: string): Promise<Message[]> {
  const result = await sql<Message>`
    SELECT id, session_id, role, content, created_at
    FROM messages
    WHERE session_id = ${sessionId}
    ORDER BY created_at ASC
    LIMIT 2
  `
  return result.rows
}

export async function deleteSession(sessionId: string): Promise<void> {
  // Messages will be deleted automatically due to ON DELETE CASCADE
  await sql`
    DELETE FROM sessions
    WHERE id = ${sessionId}
  `
}

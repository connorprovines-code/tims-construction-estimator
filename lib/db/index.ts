import { createClient } from '@supabase/supabase-js'

// Use service role key for server-side operations (bypasses RLS)
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

const supabase = getSupabaseClient()

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
  await supabase
    .from('sessions')
    .upsert({ id: sessionId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .select()
}

export async function updateSessionTitle(sessionId: string, title: string): Promise<void> {
  await supabase
    .from('sessions')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
}

export async function updateSessionTimestamp(sessionId: string): Promise<void> {
  await supabase
    .from('sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId)
}

export async function getSessions(limit: number = 50): Promise<Session[]> {
  console.log('getSessions: Fetching sessions from Supabase...')
  const { data, error } = await supabase
    .from('sessions')
    .select('id, title, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('getSessions: Error from Supabase:', error)
    throw error
  }
  console.log('getSessions: Received data:', data?.length || 0, 'sessions')
  return data || []
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, title, created_at, updated_at')
    .eq('id', sessionId)
    .single()

  if (error) return null
  return data
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
  await supabase
    .from('messages')
    .insert({ session_id: sessionId, role, content, created_at: new Date().toISOString() })

  // Update session timestamp
  await updateSessionTimestamp(sessionId)
}

export async function getMessages(sessionId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, session_id, role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getFirstTwoMessages(sessionId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, session_id, role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(2)

  if (error) throw error
  return data || []
}

export async function deleteSession(sessionId: string): Promise<void> {
  // Messages will be deleted automatically due to ON DELETE CASCADE
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)

  if (error) {
    console.error('Error deleting session from database:', error)
    throw error
  }
  console.log('Successfully deleted session:', sessionId)
}

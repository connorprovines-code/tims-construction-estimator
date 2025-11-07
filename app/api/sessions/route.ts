import { NextResponse } from 'next/server'
import { getSessions } from '@/lib/db'

export async function GET() {
  try {
    const sessions = await getSessions(50)
    console.log('Fetched sessions:', sessions.length, 'sessions')
    console.log('Sessions data:', JSON.stringify(sessions, null, 2))
    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

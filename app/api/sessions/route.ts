import { NextResponse } from 'next/server'
import { getSessions } from '@/lib/db'

export async function GET() {
  try {
    const sessions = await getSessions(50)
    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

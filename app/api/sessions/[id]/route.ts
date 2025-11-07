import { NextResponse } from 'next/server'
import { getMessages, deleteSession } from '@/lib/db'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const messages = await getMessages(params.id)
    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await deleteSession(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
  }
}

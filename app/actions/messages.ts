'use server'

import { saveMessage, getFirstTwoMessages, updateSessionTitle } from '@/lib/db'
import { generateSessionTitle } from '@/lib/generateSessionTitle'

export async function saveUserMessage(sessionId: string, content: string) {
  try {
    await saveMessage(sessionId, 'user', content)
    return { success: true }
  } catch (error) {
    console.error('Error saving user message:', error)
    return { success: false, error: 'Failed to save message' }
  }
}

export async function saveAssistantMessage(sessionId: string, content: string) {
  try {
    await saveMessage(sessionId, 'assistant', content)

    // Check if this is the first assistant response (2 messages total)
    const messages = await getFirstTwoMessages(sessionId)

    if (messages.length === 2) {
      // Generate and save title in the background
      const userMsg = messages.find((m) => m.role === 'user')
      const assistantMsg = messages.find((m) => m.role === 'assistant')

      if (userMsg && assistantMsg) {
        // Don't await - let it run in background
        generateSessionTitle(userMsg.content, assistantMsg.content)
          .then((title) => updateSessionTitle(sessionId, title))
          .catch((err) => console.error('Error generating title:', err))
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error saving assistant message:', error)
    return { success: false, error: 'Failed to save message' }
  }
}

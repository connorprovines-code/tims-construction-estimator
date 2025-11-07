import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function generateSessionTitle(
  userMessage: string,
  assistantMessage: string
): Promise<string> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // Cheapest/fastest model
      max_tokens: 20,
      messages: [
        {
          role: 'user',
          content: `Generate a brief 3-5 word title for this construction estimate conversation:

User: "${userMessage.slice(0, 200)}"
Assistant: "${assistantMessage.slice(0, 200)}"

Title (3-5 words only):`,
        },
      ],
    })

    const title = message.content[0].type === 'text' ? message.content[0].text.trim() : 'Untitled Conversation'
    return title
  } catch (error) {
    console.error('Error generating session title:', error)
    // Fallback to first 50 characters of user message
    return userMessage.slice(0, 50).trim() + (userMessage.length > 50 ? '...' : '')
  }
}

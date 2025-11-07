'use client'

import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import ReactMarkdown from 'react-markdown'
import { upload } from '@vercel/blob/client'
import { sendChatMessage } from './actions/chat'
import { saveUserMessage, saveAssistantMessage } from './actions/messages'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPDF, setSelectedPDF] = useState<File | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Generate session ID on mount
  useEffect(() => {
    setSessionId(uuidv4())
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(e)
    }
    // Allow Shift+Enter for line breaks (default behavior)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setSelectedPDF(file)
    } else if (file) {
      alert('Please select a PDF file')
    }
  }

  const handleRemovePDF = () => {
    setSelectedPDF(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if ((!inputValue.trim() && !selectedPDF) || isLoading || !sessionId) return

    const userMessage = inputValue.trim() || (selectedPDF ? `Uploaded PDF: ${selectedPDF.name}` : '')
    setInputValue('')
    setIsLoading(true)

    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])

    // Save user message to database
    saveUserMessage(sessionId, userMessage).catch(err =>
      console.error('Failed to save user message:', err)
    )

    try {
      let pdfUrl: string | null = null

      // Upload PDF directly to Vercel Blob from client (bypasses serverless limits)
      if (selectedPDF) {
        try {
          const newBlob = await upload(selectedPDF.name, selectedPDF, {
            access: 'public',
            handleUploadUrl: '/api/upload',
          })
          pdfUrl = newBlob.url
          console.log('PDF uploaded to Blob:', pdfUrl)
        } catch (uploadError) {
          console.error('Error uploading PDF:', uploadError)
          throw new Error('Failed to upload PDF')
        }
      }

      const formData = new FormData()
      formData.append('message', userMessage)
      formData.append('sessionId', sessionId)
      if (pdfUrl) {
        formData.append('pdfUrl', pdfUrl)
      }

      // Use Server Action with PDF URL (not the file itself)
      const data = await sendChatMessage(formData)

      if (data.error) {
        throw new Error(data.error)
      }

      if (!data.jobId) {
        throw new Error('No job ID returned')
      }

      // Add "Processing..." message
      const processingMessageIndex = messages.length + 1
      setMessages(prev => [...prev, { role: 'assistant', content: '⏳ Processing your request...' }])

      // Poll for results
      let pollCount = 0
      const maxPolls = 200 // 200 * 3 seconds = 10 minutes
      const pollInterval = setInterval(async () => {
        try {
          pollCount++
          console.log(`Polling for results (attempt ${pollCount}):`, data.jobId)

          const response = await fetch(`/api/results/${data.jobId}`)
          const result = await response.json()
          console.log('Poll result:', result)

          if (result.status === 'completed') {
            clearInterval(pollInterval)
            const assistantResponse = result.response || 'Processing completed'

            // Update the processing message with actual response
            setMessages(prev => {
              const updated = [...prev]
              updated[processingMessageIndex] = {
                role: 'assistant',
                content: assistantResponse
              }
              return updated
            })

            // Save assistant message to database
            saveAssistantMessage(sessionId, assistantResponse).catch(err =>
              console.error('Failed to save assistant message:', err)
            )

            setIsLoading(false)
          } else if (result.status === 'error') {
            clearInterval(pollInterval)
            setMessages(prev => {
              const updated = [...prev]
              updated[processingMessageIndex] = {
                role: 'assistant',
                content: `Error: ${result.error || 'Processing failed'}`
              }
              return updated
            })
            setIsLoading(false)
          } else if (pollCount >= maxPolls) {
            // Timeout after max polls
            clearInterval(pollInterval)
            setMessages(prev => {
              const updated = [...prev]
              updated[processingMessageIndex] = {
                role: 'assistant',
                content: 'Request timed out. Please try again.'
              }
              return updated
            })
            setIsLoading(false)
          }
          // If status is 'processing', continue polling
        } catch (pollError) {
          console.error('Error polling for results:', pollError)
          clearInterval(pollInterval)
          setMessages(prev => {
            const updated = [...prev]
            updated[processingMessageIndex] = {
              role: 'assistant',
              content: 'Error checking results. Please try again.'
            }
            return updated
          })
          setIsLoading(false)
        }
      }, 3000) // Poll every 3 seconds
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
      ])
    } finally {
      setIsLoading(false)
      setSelectedPDF(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-lg p-2">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                AI Estimator for Turner & Son Homes
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            // Welcome Screen
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="bg-white rounded-lg shadow-sm p-8 max-w-2xl border border-slate-200">
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-5">
                  <svg
                    className="w-9 h-9 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-3">
                  AI-Powered Cost Estimator
                </h2>
                <p className="text-base text-slate-600 mb-8 leading-relaxed">
                  Describe your project details or upload plans, and get instant cost estimates based on historical data and AI analysis.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Example</p>
                    <p className="text-sm text-slate-700">
                      "What's the cost for a 2,500 sq ft ranch-style build?"
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Example</p>
                    <p className="text-sm text-slate-700">
                      "Estimate materials for kitchen remodel, 300 sq ft"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Messages
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-white text-slate-800 shadow-md border border-slate-200'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="text-sm prose prose-sm max-w-none prose-slate prose-headings:text-slate-800 prose-p:text-slate-700 prose-strong:text-slate-900 prose-code:text-slate-800 prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-100 prose-pre:text-slate-800">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl px-4 py-3 shadow-md border border-slate-200">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* PDF Preview */}
          {selectedPDF && (
            <div className="mb-3 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-blue-800 flex-1 truncate">{selectedPDF.name}</span>
              <button
                type="button"
                onClick={handleRemovePDF}
                className="text-blue-600 hover:text-blue-800 focus:outline-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <form onSubmit={sendMessage} className="flex gap-3">
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || !sessionId}
              className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:bg-slate-100 disabled:cursor-not-allowed transition-colors self-end flex items-center gap-2"
              title="Upload PDF"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span className="hidden sm:inline">PDF</span>
            </button>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your construction project... (Shift+Enter for new line)"
              disabled={isLoading || !sessionId}
              rows={1}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-800 placeholder-slate-400 resize-none min-h-[48px] max-h-[200px] overflow-y-auto"
            />
            <button
              type="submit"
              disabled={isLoading || (!inputValue.trim() && !selectedPDF) || !sessionId}
              className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm self-end"
            >
              {isLoading ? (
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                'Send'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

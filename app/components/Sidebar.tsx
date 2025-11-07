'use client'

import { useState, useEffect } from 'react'

interface Session {
  id: string
  title: string | null
  created_at: string
  updated_at: string
}

interface SidebarProps {
  currentSessionId: string
  onLoadSession: (sessionId: string, messages: any[]) => void
  onNewChat: () => void
}

export default function Sidebar({ currentSessionId, onLoadSession, onNewChat }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch sessions when sidebar opens
  useEffect(() => {
    if (isOpen) {
      fetchSessions()
    }
  }, [isOpen])

  const fetchSessions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/sessions')
      const data = await response.json()
      console.log('Sidebar received sessions:', data)
      setSessions(data.sessions || [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`)
      const data = await response.json()
      onLoadSession(sessionId, data.messages || [])
      setIsOpen(false)
    } catch (error) {
      console.error('Error loading session:', error)
    }
  }

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this conversation?')) return

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
      const result = await response.json()

      if (!response.ok) {
        console.error('Delete failed:', result)
        alert('Failed to delete conversation')
        return
      }

      console.log('Delete successful, removing from UI')
      setSessions(sessions.filter((s) => s.id !== sessionId))

      // If deleted current session, start new chat
      if (sessionId === currentSessionId) {
        onNewChat()
      }
    } catch (error) {
      console.error('Error deleting session:', error)
      alert('Failed to delete conversation')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md hover:bg-slate-50 transition-colors border border-slate-200"
        aria-label="Toggle sidebar"
      >
        <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">Chat History</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => {
                onNewChat()
                setIsOpen(false)
              }}
              className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-accent transition-colors font-medium text-sm"
            >
              + New Chat
            </button>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-slate-500 text-sm">Loading...</div>
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-slate-500 text-sm">No conversations yet</div>
              </div>
            ) : (
              <div className="p-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => handleLoadSession(session.id)}
                    className={`group relative p-3 mb-2 rounded-lg cursor-pointer transition-all ${
                      session.id === currentSessionId
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {session.title || 'Untitled Conversation'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDate(session.updated_at)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-all"
                        aria-label="Delete conversation"
                      >
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

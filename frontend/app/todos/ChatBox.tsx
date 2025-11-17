'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

interface Message {
  _id: string
  username: string
  message: string
  createdAt: string
  teamId?: string | null
}

interface Team {
  _id: string
  name: string
  description?: string
  createdBy: { _id: string; username: string }
  members: Array<{ _id: string; username: string }>
  createdAt: string
}

interface ChatBoxProps {
  onClose: () => void
}

export default function ChatBox({ onClose }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null) // null = general chat
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')
  const [allUsers, setAllUsers] = useState<Array<{ _id: string; username: string }>>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user, token } = useAuth()

  const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/todos', '') || 'http://localhost:5000/api'

  // Generate consistent color for username
  const getUsernameColor = (username: string) => {
    const colors = [
      'text-red-600',
      'text-orange-600',
      'text-amber-600',
      'text-yellow-600',
      'text-lime-600',
      'text-green-600',
      'text-emerald-600',
      'text-teal-600',
      'text-cyan-600',
      'text-sky-600',
      'text-blue-600',
      'text-indigo-600',
      'text-violet-600',
      'text-purple-600',
      'text-fuchsia-600',
      'text-pink-600',
      'text-rose-600',
    ]
    
    // Generate a consistent index based on username
    let hash = 0
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % colors.length
    return colors[index]
  }

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const url = selectedTeam 
        ? `${API_URL}/messages?teamId=${selectedTeam}`
        : `${API_URL}/messages`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await response.json()

      if (data.success) {
        setMessages(data.data)
        setError('')
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    }
  }

  // Fetch teams
  const fetchTeams = async () => {
    try {
      const response = await fetch(`${API_URL}/teams`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await response.json()

      if (data.success) {
        setTeams(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch teams:', err)
    }
  }

  // Fetch all users
  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await response.json()

      if (data.success) {
        setAllUsers(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  // Send message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) return

    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          message: newMessage,
          teamId: selectedTeam,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setNewMessage('')
        fetchMessages()
      } else {
        setError('Failed to send message')
      }
    } catch (err) {
      setError('Failed to send message')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Create team
  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!teamName.trim()) return

    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: teamName,
          description: teamDescription,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setTeamName('')
        setTeamDescription('')
        setShowCreateTeam(false)
        fetchTeams()
      } else {
        setError('Failed to create team')
      }
    } catch (err) {
      setError('Failed to create team')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Add members to team
  const addMembersToTeam = async () => {
    if (!selectedTeam || selectedUsers.length === 0) return

    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/teams/${selectedTeam}/members`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          members: selectedUsers,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSelectedUsers([])
        setShowAddMembers(false)
        fetchTeams()
      } else {
        setError('Failed to add members')
      }
    } catch (err) {
      setError('Failed to add members')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Fetch messages on mount and set interval for auto-refresh
  useEffect(() => {
    fetchMessages()
    fetchTeams()
    const interval = setInterval(fetchMessages, 3000) // Refresh every 3 seconds
    return () => clearInterval(interval)
  }, [selectedTeam])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Get current chat name
  const getCurrentChatName = () => {
    if (!selectedTeam) return 'General Chat'
    const team = teams.find(t => t._id === selectedTeam)
    return team ? team.name : 'Team Chat'
  }

  // Get current team
  const getCurrentTeam = () => {
    return teams.find(t => t._id === selectedTeam)
  }

  // Check if current user is team creator
  const isTeamCreator = () => {
    const team = getCurrentTeam()
    return team && team.createdBy._id === user?.id
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-3 rounded-t-2xl">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="font-semibold text-base">{getCurrentChatName()}</h3>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 rounded-full p-1 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Chat Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedTeam(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
              !selectedTeam 
                ? 'bg-white text-purple-600' 
                : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            General
          </button>
          {teams.map(team => (
            <button
              key={team._id}
              onClick={() => setSelectedTeam(team._id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                selectedTeam === team._id 
                  ? 'bg-white text-purple-600' 
                  : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              {team.name}
            </button>
          ))}
          <button
            onClick={() => setShowCreateTeam(true)}
            className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-white/20 hover:bg-white/30 transition"
            title="Create Team"
          >
            + Team
          </button>
        </div>

        {/* Team Info */}
        {selectedTeam && getCurrentTeam() && (
          <div className="mt-2 pt-2 border-t border-white/20">
            <p className="text-xs text-white/80">
              {getCurrentTeam()?.members.length} members
              {isTeamCreator() && (
                <button
                  onClick={() => {
                    setShowAddMembers(true)
                    fetchUsers()
                  }}
                  className="ml-2 text-xs underline hover:text-white"
                >
                  + Add
                </button>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isCurrentUser = msg.username === user?.username
            return (
              <div
                key={msg._id}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    isCurrentUser
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'bg-white text-gray-800 border border-gray-200'
                  }`}
                >
                  <p className={`text-xs font-semibold mb-1 ${isCurrentUser ? 'text-purple-100' : getUsernameColor(msg.username)}`}>
                    {msg.username}
                  </p>
                  <p className="text-sm break-words">{msg.message}</p>
                  <p className={`text-xs mt-1 ${isCurrentUser ? 'text-purple-200' : 'text-gray-500'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-200 rounded-b-2xl">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={loading || !newMessage.trim()}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-2 rounded-full hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>

      {/* Create Team Modal */}
      {showCreateTeam && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl z-10">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Create New Team</h3>
            <form onSubmit={createTeam} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter team name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                  maxLength={50}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  placeholder="Enter description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm resize-none"
                  rows={3}
                  maxLength={200}
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateTeam(false)
                    setTeamName('')
                    setTeamDescription('')
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !teamName.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Members Modal */}
      {showAddMembers && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl z-10">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl max-h-[500px] flex flex-col">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Add Team Members</h3>
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {allUsers
                .filter(u => {
                  const team = getCurrentTeam()
                  return team && !team.members.some(m => m._id === u._id)
                })
                .map(u => (
                  <label
                    key={u._id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(u._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, u._id])
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== u._id))
                        }
                      }}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">{u.username}</span>
                  </label>
                ))}
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  setShowAddMembers(false)
                  setSelectedUsers([])
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addMembersToTeam}
                disabled={loading || selectedUsers.length === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm disabled:opacity-50"
              >
                Add {selectedUsers.length > 0 && `(${selectedUsers.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

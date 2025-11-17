'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../context/AuthContext'
import TimePicker from '../TimePicker'

interface User {
  _id: string
  username: string
}

export default function AssignTaskPage() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user, token, logout, isAuthenticated } = useAuth()
  const router = useRouter()

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/todos', '') || 'http://localhost:5000/api'
  const TODOS_URL = `${API_BASE_URL}/todos`
  const USERS_URL = `${API_BASE_URL}/users`

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) {
        console.log('No token available')
        return
      }

      try {
        console.log('Fetching users from:', USERS_URL)
        const response = await fetch(USERS_URL, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        const data = await response.json()
        console.log('Users response:', data)

        if (data.success) {
          setUsers(data.data)
        } else {
          console.error('Failed to fetch users:', data)
          setError('Failed to load users')
        }
      } catch (err) {
        console.error('Failed to fetch users:', err)
        setError('Failed to load users')
      }
    }

    if (isAuthenticated && token) {
      fetchUsers()
    }
  }, [token, isAuthenticated, USERS_URL])

  // Handle assign task
  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Please enter a title')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(TODOS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          deadline: deadline || null,
          priority: priority || null,
          assignedTo: selectedUsers,
        }),
      })

      const data = await response.json()

      if (data.success) {
        router.push('/todos')
      } else if (response.status === 401) {
        logout()
      } else {
        setError('Failed to create task')
      }
    } catch (err) {
      setError('Failed to create task')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId))
    } else {
      setSelectedUsers([...selectedUsers, userId])
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
                Assign New Task
              </h1>
              {user && <p className="text-sm text-gray-600 mt-1">Creating task as {user.username}</p>}
            </div>
            <div className="flex gap-3">
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium"
              >
                Logout
              </button>
              <Link
                href="/todos"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Todos
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleAssignTask} className="space-y-6">
            {/* Task Details Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Task Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter task title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    placeholder="Enter task description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition resize-none"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📅 Deadline (optional)
                    </label>
                    <TimePicker value={deadline} onChange={setDeadline} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🎯 Priority (optional)
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high' | '')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition bg-white"
                    >
                      <option value="">No priority</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Assign Users Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Assign to Users</h2>
              
              {users.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p className="text-sm">Loading users...</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">Select users to assign this task:</p>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-2">
                    {users.map((u) => (
                      <label
                        key={u._id}
                        className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-purple-50 border border-gray-200 transition"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u._id)}
                          onChange={() => toggleUser(u._id)}
                          className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <span className="text-gray-700 font-medium">{u.username}</span>
                      </label>
                    ))}
                  </div>
                  
                  {selectedUsers.length > 0 && (
                    <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-sm text-purple-700 font-medium">
                        ✓ {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Link
                href="/todos"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? 'Creating Task...' : 'Create & Assign Task'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

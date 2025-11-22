'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../context/AuthContext'
import TimePicker from './TimePicker'
import ChatBox from './ChatBox'
import styles from './todos.module.css'
import { io, Socket } from 'socket.io-client'

interface Todo {
  _id: string
  title: string
  description?: string
  completed: boolean
  deadline?: string
  priority?: 'low' | 'medium' | 'high'
  createdAt: string
  assignedTo?: Array<{ _id: string; username: string }>
  userId?: { _id: string; username: string }
}

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all')
  const [chatOpen, setChatOpen] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(false)
  const backgroundSocketRef = useRef<Socket | null>(null)
  
  const { user, token, logout, isAuthenticated } = useAuth()
  const router = useRouter()

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  // Get API URL from environment variable
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/todos'

  // Fetch todos from backend
  const fetchTodos = async () => {
    if (!token) return
    
    try {
      setLoading(true)
      const response = await fetch(API_URL, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await response.json()
      
      if (data.success) {
        setTodos(data.data)
        setError('')
      } else if (response.status === 401) {
        logout()
      }
    } catch (err) {
      setError('Failed to fetch todos. Make sure the backend is running.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Create new todo
  const createTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      setError('Please enter a title')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description, deadline: deadline || null, priority: priority || null }),
      })

      const data = await response.json()

      if (data.success) {
        setTitle('')
        setDescription('')
        setDeadline('')
        setPriority('')
        setError('')
        fetchTodos()
      } else if (response.status === 401) {
        logout()
      }
    } catch (err) {
      setError('Failed to create todo')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  // Toggle todo completion
  const toggleTodo = async (id: string, completed: boolean) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ completed: !completed }),
      })

      const data = await response.json()

      if (data.success) {
        fetchTodos()
      } else if (response.status === 401) {
        logout()
      }
    } catch (err) {
      setError('Failed to update todo')
      console.error(err)
    }
  }

  // Delete todo
  const deleteTodo = async (id: string) => {
    if (!confirm('Are you sure you want to delete this todo?')) return

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        fetchTodos()
      } else if (response.status === 401) {
        logout()
      }
    } catch (err) {
      setError('Failed to delete todo')
      console.error(err)
    }
  }

  // Fetch todos on component mount
  useEffect(() => {
    fetchTodos()
  }, [])

  // Setup background Socket.IO connection to listen for messages when chat is closed
  useEffect(() => {
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000'
    
    // Only connect if user is authenticated
    if (!user?.id) return

    // Create background socket connection
    backgroundSocketRef.current = io(SOCKET_URL)

    // Listen for new messages
    backgroundSocketRef.current.on('newMessage', (message: any) => {
      // Only auto-open if chat is currently closed and message is from someone else
      if (!chatOpen && message.username !== user.username) {
        console.log('New message received while chat closed, opening chat...')
        setHasNewMessage(true)
        setChatOpen(true)
      }
    })

    // Cleanup on unmount
    return () => {
      if (backgroundSocketRef.current) {
        backgroundSocketRef.current.disconnect()
      }
    }
  }, [user?.id, user?.username, chatOpen])

  return (
    <div className={styles.todosContainer}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.headerTitle}>My Todos</h1>
            {user && <p className="text-sm text-gray-600 mt-1">Welcome, {user.username}!</p>}
          </div>
          <div className="flex gap-3">
            <Link
              href="/projects"
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:shadow-lg transition font-medium"
            >
              📋 Projects
            </Link>
            <Link
              href="/todos/assign"
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition font-medium"
            >
              Assign Task
            </Link>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium"
            >
              Logout
            </button>
            <Link href="/" className={styles.backButton}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className={styles.mainContent}>
        {/* Add Todo Form */}
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>Add New Todo</h2>
          <form onSubmit={createTodo} className={styles.formInputs}>
            <div>
              <input
                type="text"
                placeholder="Todo title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={styles.inputField}
              />
            </div>
            <div>
              <textarea
                placeholder="Description (optional)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className={styles.textareaField}
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formColumn}>
                <label className={styles.deadlineLabel}>
                  📅 Set Deadline (optional)
                </label>
                <TimePicker value={deadline} onChange={setDeadline} />
              </div>
              <div className={styles.formColumn}>
                <label className={styles.priorityLabel}>
                  🎯 Priority (optional)
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high' | '')}
                  className={styles.selectField}
                >
                  <option value="">No priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className={styles.submitButton}
            >
              {submitting ? 'Adding...' : 'Add Todo'}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        {/* Stats */}
        {!loading && todos.length > 0 && (
          <div className={styles.statsCard}>
            <div className={styles.statsContent}>
              <button onClick={() => setFilter('all')} className={styles.statItem}>
                <p className={styles.statNumber}>{todos.length}</p>
                <p className={styles.statLabel}>Total</p>
              </button>
              <button onClick={() => setFilter('completed')} className={styles.statItem}>
                <p className={styles.statNumberCompleted}>
                  {todos.filter((t) => t.completed).length}
                </p>
                <p className={styles.statLabel}>Completed</p>
              </button>
              <button onClick={() => setFilter('pending')} className={styles.statItem}>
                <p className={styles.statNumberPending}>
                  {todos.filter((t) => !t.completed).length}
                </p>
                <p className={styles.statLabel}>Pending</p>
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p className={styles.loadingText}>Loading todos...</p>
          </div>
        )}

        {/* Todos List */}
        {!loading && (
          <div className={styles.todosList}>
            {todos.length === 0 ? (
              <div className={styles.emptyState}>
                <svg className={styles.emptyStateIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className={styles.emptyStateText}>No todos yet. Create your first one above!</p>
              </div>
            ) : (
              <>
                {filter !== 'all' && (
                  <div className={styles.filterHeader}>
                    <span className={styles.filterText}>
                      Showing: {filter === 'completed' ? 'Completed' : 'Pending'} Tasks
                    </span>
                    <button onClick={() => setFilter('all')} className={styles.clearFilterButton}>
                      Show All
                    </button>
                  </div>
                )}
                {todos
                  .filter((todo) => {
                    if (filter === 'completed') return todo.completed
                    if (filter === 'pending') return !todo.completed
                    return true
                  })
                  .map((todo) => (
                <div key={todo._id} className={styles.todoItem}>
                  <div className={styles.todoItemContent}>
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTodo(todo._id, todo.completed)}
                      className={`${styles.checkboxButton} ${
                        todo.completed ? styles.checkboxButtonChecked : styles.checkboxButtonUnchecked
                      }`}
                    >
                      {todo.completed && (
                        <svg className={styles.checkIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    {/* Content */}
                    <div className={styles.todoContent}>
                      <div className={styles.todoTitleRow}>
                        <h3 className={todo.completed ? styles.todoTitleCompleted : styles.todoTitle}>
                          {todo.title}
                        </h3>
                        {todo.priority && (
                          <span className={`${styles.priorityBadge} ${styles['priority' + todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)]}`}>
                            {todo.priority === 'low' && '🟢'}
                            {todo.priority === 'medium' && '🟡'}
                            {todo.priority === 'high' && '🔴'}
                            {' '}{todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}
                          </span>
                        )}
                      </div>
                      {todo.description && (
                        <p className={styles.todoDescription}>{todo.description}</p>
                      )}
                      {todo.userId && (
                        <p className="text-xs text-gray-500 mt-1">
                          Created by: <span className="font-medium text-blue-600">{todo.userId.username}</span>
                        </p>
                      )}
                      {todo.assignedTo && todo.assignedTo.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {todo.assignedTo.map((user) => (
                            <span
                              key={user._id}
                              className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
                            >
                              👤 {user.username}
                            </span>
                          ))}
                        </div>
                      )}
                      {todo.deadline && (
                        <p className={styles.todoDeadline} style={{
                          color: new Date(todo.deadline) < new Date() && !todo.completed ? '#ef4444' : '#6b7280',
                          fontWeight: new Date(todo.deadline) < new Date() && !todo.completed ? '600' : '500'
                        }}>
                          🕒 {new Date(todo.deadline).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })} at {new Date(todo.deadline).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                          {new Date(todo.deadline) < new Date() && !todo.completed && ' • Overdue'}
                        </p>
                      )}
                      <p className={styles.todoTimestamp}>
                        {new Date(todo.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => deleteTodo(todo._id)}
                      className={styles.deleteButton}
                      title="Delete todo"
                    >
                      <svg className={styles.deleteIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </>
            )}
          </div>
        )}
      </main>

      {/* Floating Chat Button */}
      {!chatOpen && (
        <button
          onClick={() => {
            setChatOpen(true)
            setHasNewMessage(false)
          }}
          className={`fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-full shadow-2xl hover:shadow-xl transform hover:scale-110 transition-all duration-300 z-40 ${
            hasNewMessage ? 'animate-bounce' : ''
          }`}
          title="Open Chat"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {hasNewMessage && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>
          )}
        </button>
      )}

      {/* Chat Box */}
      {chatOpen && <ChatBox onClose={() => setChatOpen(false)} />}
    </div>
  )
}

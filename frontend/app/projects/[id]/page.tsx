'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../context/AuthContext'
import { io, Socket } from 'socket.io-client'

interface Task {
  _id: string
  title: string
  description?: string
  assignedTo: Array<{ _id: string; username: string }>
  createdBy: { _id: string; username: string }
  currentPhase: string
  points: number
  priority: string
  status: string
  estimatedHours?: number
}

interface Project {
  _id: string
  name: string
  description?: string
  phases: Array<{ name: string; order: number; color: string }>
  members: Array<{ _id: string; username: string }>
  createdBy: { _id: string; username: string }
}

export default function ProjectBoardPage() {
  const params = useParams()
  const projectId = params.id as string
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [selectedPhase, setSelectedPhase] = useState('')
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    points: 0,
    priority: 'medium' as 'low' | 'medium' | 'high',
    estimatedHours: 0,
    assignedTo: [] as string[],
  })
  const socketRef = useRef<Socket | null>(null)
  const { user, token, logout, isAuthenticated } = useAuth()
  const router = useRouter()

  const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/todos', '') || 'http://localhost:5000/api'
  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000'

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  const fetchProject = async () => {
    try {
      const response = await fetch(`${API_URL}/projects/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await response.json()

      if (data.success) {
        setProject(data.data)
      } else {
        setError('Failed to load project')
      }
    } catch (err) {
      setError('Failed to load project')
      console.error(err)
    }
  }

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_URL}/projects/${projectId}/tasks`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await response.json()

      if (data.success) {
        setTasks(data.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId && token) {
      fetchProject()
      fetchTasks()

      // Setup Socket.IO
      socketRef.current = io(SOCKET_URL)
      socketRef.current.emit('joinProject', projectId)

      socketRef.current.on('taskCreated', (task: Task) => {
        setTasks(prev => [...prev, task])
      })

      socketRef.current.on('taskMoved', ({ task }: { task: Task }) => {
        setTasks(prev => prev.map(t => t._id === task._id ? task : t))
      })

      socketRef.current.on('taskUpdated', (task: Task) => {
        setTasks(prev => prev.map(t => t._id === task._id ? task : t))
      })

      socketRef.current.on('taskDeleted', (taskId: string) => {
        setTasks(prev => prev.filter(t => t._id !== taskId))
      })

      return () => {
        if (socketRef.current) {
          socketRef.current.emit('leaveProject', projectId)
          socketRef.current.disconnect()
        }
      }
    }
  }, [projectId, token])

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch(`${API_URL}/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...taskForm,
          currentPhase: selectedPhase,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setShowTaskModal(false)
        setTaskForm({
          title: '',
          description: '',
          points: 0,
          priority: 'medium',
          estimatedHours: 0,
          assignedTo: [],
        })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    const task = tasks.find(t => t._id === taskId)
    if (!task || !canDragTask(task)) {
      e.preventDefault()
      return
    }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('taskId', taskId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, toPhase: string) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    const task = tasks.find(t => t._id === taskId)

    if (!task || task.currentPhase === toPhase) return

    try {
      await fetch(`${API_URL}/projects/${projectId}/tasks/${taskId}/move`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ toPhase }),
      })
    } catch (err) {
      console.error(err)
    }
  }

  const getTasksByPhase = (phaseName: string) => {
    return tasks.filter(t => t.currentPhase === phaseName)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPhaseStats = (phaseName: string) => {
    const phaseTasks = getTasksByPhase(phaseName)
    const totalPoints = phaseTasks.reduce((sum, t) => sum + t.points, 0)
    return { count: phaseTasks.length, points: totalPoints }
  }

  const isProjectCreator = () => {
    return user && project && project.createdBy._id === user.id
  }

  const canDragTask = (task: Task) => {
    if (!user) return false
    return task.assignedTo.some(u => u._id === user.id)
  }

  const getUserWorkStats = () => {
    const userStats: { [key: string]: { username: string; points: number; tasks: number; color: string } } = {}
    const colors = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#14b8a6', '#a855f7']
    
    // Only count completed tasks (Done phase or completed status)
    const completedTasks = tasks.filter(task => task.currentPhase === 'Done' || task.status === 'completed')
    
    completedTasks.forEach(task => {
      task.assignedTo.forEach(user => {
        if (!userStats[user._id]) {
          userStats[user._id] = {
            username: user.username,
            points: 0,
            tasks: 0,
            color: colors[Object.keys(userStats).length % colors.length]
          }
        }
        userStats[user._id].points += task.points
        userStats[user._id].tasks += 1
      })
    })

    const total = Object.values(userStats).reduce((sum, stat) => sum + stat.points, 0)
    return Object.entries(userStats).map(([userId, stat]) => ({
      userId,
      ...stat,
      percentage: total > 0 ? (stat.points / total * 100) : 0
    })).sort((a, b) => b.points - a.points)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Project not found'}</p>
          <Link href="/projects" className="text-purple-600 hover:underline">
            Back to Projects
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-gray-600">{project.description}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Link
                href="/projects"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                ← Back
              </Link>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Team Members */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500">Team:</span>
            {project.members.map(member => (
              <span key={member._id} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                {member.username}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <main className="p-6">
        {/* User Work Distribution Chart - Only show for completed tasks */}
        {getUserWorkStats().length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Completed Work Distribution</h3>
            <div className="flex flex-wrap gap-6 items-center">
              {/* Pie Chart */}
              <div className="relative">
                <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
                  {getUserWorkStats().reduce((acc, stat, index, array) => {
                    const prevPercentage = array.slice(0, index).reduce((sum, s) => sum + s.percentage, 0)
                    const startAngle = (prevPercentage / 100) * 360
                    const endAngle = ((prevPercentage + stat.percentage) / 100) * 360
                    const largeArc = stat.percentage > 50 ? 1 : 0
                    
                    const startX = 100 + 90 * Math.cos((startAngle * Math.PI) / 180)
                    const startY = 100 + 90 * Math.sin((startAngle * Math.PI) / 180)
                    const endX = 100 + 90 * Math.cos((endAngle * Math.PI) / 180)
                    const endY = 100 + 90 * Math.sin((endAngle * Math.PI) / 180)
                    
                    return [
                      ...acc,
                      <path
                        key={stat.userId}
                        d={`M 100 100 L ${startX} ${startY} A 90 90 0 ${largeArc} 1 ${endX} ${endY} Z`}
                        fill={stat.color}
                        stroke="white"
                        strokeWidth="2"
                      />
                    ]
                  }, [] as JSX.Element[])}
                  <circle cx="100" cy="100" r="50" fill="white" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">
                      {getUserWorkStats().reduce((sum, s) => sum + s.tasks, 0)}
                    </div>
                    <div className="text-xs text-gray-500">Done</div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 min-w-[200px]">
                <div className="space-y-2">
                  {getUserWorkStats().map(stat => (
                    <div key={stat.userId} className="flex items-center justify-between gap-4 p-2 hover:bg-gray-50 rounded">
                      <div className="flex items-center gap-2 flex-1">
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: stat.color }}
                        />
                        <span className="text-sm font-medium text-gray-700">{stat.username}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-600">{stat.tasks} tasks</span>
                        <span className="font-semibold text-gray-800">{stat.points} pts</span>
                        <span className="text-purple-600 font-bold min-w-[45px] text-right">
                          {stat.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 overflow-x-auto pb-4">
          {project.phases.sort((a, b) => a.order - b.order).map(phase => {
            const stats = getPhaseStats(phase.name)
            return (
              <div
                key={phase.name}
                className="flex-shrink-0 w-80 bg-white rounded-lg shadow-md"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, phase.name)}
              >
                {/* Phase Header */}
                <div className="p-4 border-b border-gray-200"
                  style={{ backgroundColor: `${phase.color}20` }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="font-bold text-gray-800">{phase.name}</h2>
                    {isProjectCreator() && (
                      <button
                        onClick={() => {
                          setSelectedPhase(phase.name)
                          setShowTaskModal(true)
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Add Task"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs text-gray-600">
                    <span>{stats.count} tasks</span>
                    <span>•</span>
                    <span>{stats.points} pts</span>
                  </div>
                </div>

                {/* Tasks */}
                <div className="p-3 space-y-3 min-h-[500px] max-h-[calc(100vh-300px)] overflow-y-auto">
                  {getTasksByPhase(phase.name).map(task => {
                    const isDraggable = canDragTask(task)
                    return (
                      <div
                        key={task._id}
                        draggable={isDraggable}
                        onDragStart={(e) => handleDragStart(e, task._id)}
                        className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition ${
                          isDraggable ? 'cursor-move' : 'cursor-not-allowed opacity-60'
                        }`}
                        title={!isDraggable ? 'Only assigned members can move this task' : ''}
                      >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-800 text-sm flex-1">{task.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>

                      {task.description && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex gap-2">
                          {task.points > 0 && <span className="font-medium">{task.points} pts</span>}
                          {task.estimatedHours && task.estimatedHours > 0 && (
                            <span>🕐 {task.estimatedHours}h</span>
                          )}
                        </div>
                        {task.assignedTo && task.assignedTo.length > 0 && (
                          <div className="flex -space-x-1">
                            {task.assignedTo.slice(0, 2).map(u => (
                              <span
                                key={u._id}
                                className="inline-block w-6 h-6 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center border border-white"
                                title={u.username}
                              >
                                {u.username[0].toUpperCase()}
                              </span>
                            ))}
                            {task.assignedTo.length > 2 && (
                              <span className="inline-block w-6 h-6 rounded-full bg-gray-400 text-white text-xs flex items-center justify-center border border-white">
                                +{task.assignedTo.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Create Task in {selectedPhase}</h2>
              <form onSubmit={createTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <input
                    type="text"
                    value={taskForm.title}
                    onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={taskForm.description}
                    onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Points</label>
                    <input
                      type="number"
                      value={taskForm.points}
                      onChange={e => setTaskForm({ ...taskForm, points: parseInt(e.target.value) || 0 })}
                      min="0"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Est. Hours</label>
                    <input
                      type="number"
                      value={taskForm.estimatedHours}
                      onChange={e => setTaskForm({ ...taskForm, estimatedHours: parseInt(e.target.value) || 0 })}
                      min="0"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Assign To</label>
                  <div className="border rounded-lg max-h-32 overflow-y-auto">
                    {project.members.map(member => (
                      <label key={member._id} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={taskForm.assignedTo.includes(member._id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setTaskForm({ ...taskForm, assignedTo: [...taskForm.assignedTo, member._id] })
                            } else {
                              setTaskForm({ ...taskForm, assignedTo: taskForm.assignedTo.filter(id => id !== member._id) })
                            }
                          }}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <span className="text-sm">{member.username}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                  >
                    Create Task
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTaskModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

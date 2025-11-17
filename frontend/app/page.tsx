'use client'

import Link from 'next/link'
import { useAuth } from './context/AuthContext'

export default function Home() {
  const { isAuthenticated, user } = useAuth()

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Heading */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
              TodoApp
            </h1>
            <p className="text-2xl md:text-3xl text-gray-700 font-medium mb-4">
              Manage Your Tasks Efficiently
            </p>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              A modern, intuitive todo application that helps you stay organized and productive. 
              Create, update, and track your tasks with ease.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="mb-16 flex gap-4 justify-center flex-wrap">
            {isAuthenticated ? (
              <>
                <Link 
                  href="/todos"
                  className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold px-8 py-4 rounded-full text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  Go to My Todos →
                </Link>
                <span className="inline-block bg-white/80 backdrop-blur-sm text-gray-700 font-medium px-6 py-4 rounded-full text-base shadow-md">
                  👋 Welcome back, {user?.username}!
                </span>
              </>
            ) : (
              <>
                <Link 
                  href="/login"
                  className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold px-8 py-4 rounded-full text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  Login
                </Link>
                <Link 
                  href="/register"
                  className="inline-block bg-white/80 backdrop-blur-sm text-purple-600 font-semibold px-8 py-4 rounded-full text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border-2 border-purple-600"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>

          {/* Features Section */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">
            {/* Feature 1 */}
            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Create Tasks</h3>
              <p className="text-gray-600">
                Quickly add new todos with titles and descriptions to keep track of everything you need to do.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Update & Track</h3>
              <p className="text-gray-600">
                Mark tasks as complete or incomplete and keep track of your progress in real-time.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-gradient-to-r from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Delete Tasks</h3>
              <p className="text-gray-600">
                Remove completed or unnecessary tasks to keep your todo list clean and organized.
              </p>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="mt-20 pt-12 border-t border-gray-300">
            <p className="text-sm text-gray-500 mb-4">Built with modern technologies</p>
            <div className="flex justify-center gap-6 flex-wrap">
              <span className="px-4 py-2 bg-white rounded-full text-sm font-medium text-gray-700 shadow-sm">Next.js</span>
              <span className="px-4 py-2 bg-white rounded-full text-sm font-medium text-gray-700 shadow-sm">TypeScript</span>
              <span className="px-4 py-2 bg-white rounded-full text-sm font-medium text-gray-700 shadow-sm">MongoDB</span>
              <span className="px-4 py-2 bg-white rounded-full text-sm font-medium text-gray-700 shadow-sm">Express</span>
              <span className="px-4 py-2 bg-white rounded-full text-sm font-medium text-gray-700 shadow-sm">Tailwind CSS</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

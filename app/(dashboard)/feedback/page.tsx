'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function FeedbackPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    subject: '',
    feedback: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.subject.trim() || !formData.feedback.trim()) {
      setError('Please fill in all fields')
      return
    }

    try {
      setLoading(true)
      setMessage('')
      setError('')

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setMessage('Thank you for your feedback! We\'ll review it shortly.')
        setFormData({ subject: '', feedback: '' })

        // Clear success message after 5 seconds
        setTimeout(() => setMessage(''), 5000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to send feedback')
      }
    } catch (err) {
      console.error('Error sending feedback:', err)
      setError('Failed to send feedback. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Send Feedback</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Help us improve HelixFlow by sharing your thoughts, suggestions, or reporting issues.
          </p>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">{message}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Feedback Form */}
        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Subject"
              type="text"
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Brief summary of your feedback"
              required
            />

            <div>
              <label htmlFor="feedback" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Feedback
              </label>
              <textarea
                id="feedback"
                rows={8}
                value={formData.feedback}
                onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="Tell us what's on your mind... Feature requests, bug reports, or general feedback are all welcome!"
                required
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Your feedback is valuable! We read every submission and use it to make HelixFlow better for everyone.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={loading}
                isLoading={loading}
              >
                {loading ? 'Sending...' : 'Send Feedback'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

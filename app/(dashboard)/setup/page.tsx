'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

export default function SetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Auto-generate slug from name if slug field is being updated via name
      ...(name === 'name' && !prev.slug && { slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        router.push('/dashboard')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create organization')
      }
    } catch (error) {
      console.error('Error creating organization:', error)
      alert('Failed to create organization')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <Card padding="lg" className="max-w-md w-full shadow-xl">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Setup Your Organization
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Create an organization to get started with PO Tool
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Organization Name *"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="e.g., Acme Corporation"
          />

          <Input
            label="Organization Slug *"
            type="text"
            name="slug"
            value={formData.slug}
            onChange={handleChange}
            required
            placeholder="e.g., acme-corporation"
            pattern="[a-z0-9-]+"
            helperText="Lowercase letters, numbers, and hyphens only"
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={loading}
            isLoading={loading}
            className="w-full"
          >
            {loading ? 'Creating...' : 'Create Organization'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

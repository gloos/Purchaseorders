'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { useUser } from '@/lib/hooks/use-user'
import { TaxType } from '@prisma/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

interface TaxRate {
  id: string
  name: string
  taxType: TaxType
  rate: number
  description: string | null
  region: string | null
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const taxTypeLabels: Record<TaxType, string> = {
  VAT: 'VAT',
  GST: 'GST',
  SALES_TAX: 'Sales Tax',
  CONSUMPTION: 'Consumption Tax',
  CUSTOM: 'Custom'
}

const taxTypeDescriptions: Record<TaxType, string> = {
  VAT: 'Value Added Tax (EU, UK, etc.)',
  GST: 'Goods and Services Tax (Canada, Australia, India, etc.)',
  SALES_TAX: 'Sales Tax (US states, etc.)',
  CONSUMPTION: 'Consumption Tax (Japan, etc.)',
  CUSTOM: 'Custom/Other tax types'
}

export default function TaxRatesPage() {
  const { hasPermission, loading: userLoading } = useUser()
  const router = useRouter()
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    taxType: 'VAT' as TaxType,
    rate: '',
    description: '',
    region: '',
    isDefault: false,
    isActive: true
  })

  useEffect(() => {
    // Wait for user role to load
    if (userLoading) return

    // Redirect if user doesn't have permission
    if (!hasPermission('canManageOrganization')) {
      router.push('/dashboard')
      return
    }

    fetchTaxRates()
  }, [hasPermission, userLoading, router])

  const fetchTaxRates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tax-rates')
      if (response.ok) {
        const data = await response.json()
        setTaxRates(data)
      } else {
        const error = await response.json()
        setMessage(`Error: ${error.error || 'Failed to fetch tax rates'}`)
      }
    } catch (error) {
      console.error('Error fetching tax rates:', error)
      setMessage('Error: Failed to fetch tax rates')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      taxType: 'VAT',
      rate: '',
      description: '',
      region: '',
      isDefault: false,
      isActive: true
    })
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (taxRate: TaxRate) => {
    setFormData({
      name: taxRate.name,
      taxType: taxRate.taxType,
      rate: taxRate.rate.toString(),
      description: taxRate.description || '',
      region: taxRate.region || '',
      isDefault: taxRate.isDefault,
      isActive: taxRate.isActive
    })
    setEditingId(taxRate.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    try {
      const url = editingId ? `/api/tax-rates/${editingId}` : '/api/tax-rates'
      const method = editingId ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`Tax rate ${editingId ? 'updated' : 'created'} successfully`)
        resetForm()
        fetchTaxRates()
      } else {
        setMessage(`Error: ${data.error || 'Failed to save tax rate'}`)
      }
    } catch (error) {
      console.error('Error saving tax rate:', error)
      setMessage('Error: Failed to save tax rate')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tax rate? This action cannot be undone.')) {
      return
    }

    try {
      setUpdating(id)
      setMessage('')

      const response = await fetch(`/api/tax-rates/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Tax rate deleted successfully')
        fetchTaxRates()
      } else {
        setMessage(`Error: ${data.error || 'Failed to delete tax rate'}`)
      }
    } catch (error) {
      console.error('Error deleting tax rate:', error)
      setMessage('Error: Failed to delete tax rate')
    } finally {
      setUpdating(null)
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      setUpdating(id)
      setMessage('')

      const response = await fetch(`/api/tax-rates/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !currentStatus })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`Tax rate ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
        fetchTaxRates()
      } else {
        setMessage(`Error: ${data.error || 'Failed to update tax rate'}`)
      }
    } catch (error) {
      console.error('Error toggling tax rate:', error)
      setMessage('Error: Failed to update tax rate')
    } finally {
      setUpdating(null)
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      setUpdating(id)
      setMessage('')

      const response = await fetch(`/api/tax-rates/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isDefault: true })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Default tax rate updated successfully')
        fetchTaxRates()
      } else {
        setMessage(`Error: ${data.error || 'Failed to set default tax rate'}`)
      }
    } catch (error) {
      console.error('Error setting default tax rate:', error)
      setMessage('Error: Failed to set default tax rate')
    } finally {
      setUpdating(null)
    }
  }

  if (userLoading || !hasPermission('canManageOrganization')) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Tax Rates</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Configure tax rates for purchase orders</p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? 'secondary' : 'primary'}
            size="md"
          >
            {showForm ? 'Cancel' : 'Add Tax Rate'}
          </Button>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.startsWith('Error')
              ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
              : 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
          }`}>
            {message}
          </div>
        )}

        {/* Create/Edit Form */}
        {showForm && (
          <Card padding="lg" className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {editingId ? 'Edit Tax Rate' : 'Add New Tax Rate'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., UK VAT Standard Rate"
                  />
                </div>

                <div>
                  <Select
                    label="Tax Type"
                    value={formData.taxType}
                    onChange={(e) => setFormData({ ...formData, taxType: e.target.value as TaxType })}
                    options={Object.entries(taxTypeLabels).map(([value, label]) => ({
                      value,
                      label
                    }))}
                  />
                </div>

                <div>
                  <Input
                    label="Rate (%)"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    required
                    placeholder="e.g., 20.00"
                  />
                </div>

                <div>
                  <Input
                    label="Region"
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    placeholder="e.g., California, London"
                  />
                </div>
              </div>

              <div>
                <Textarea
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Optional description"
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Set as default</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Active</span>
                </label>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                >
                  {editingId ? 'Update' : 'Create'} Tax Rate
                </Button>
                <Button
                  type="button"
                  onClick={resetForm}
                  variant="secondary"
                  size="md"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Tax Rates List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          </div>
        ) : taxRates.length === 0 ? (
          <Card padding="lg" className="text-center">
            <p className="text-slate-600 dark:text-slate-400">No tax rates configured</p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">Create your first tax rate to get started</p>
          </Card>
        ) : (
          <Card padding="sm" className="overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Region
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {taxRates.map((taxRate) => (
                  <tr key={taxRate.id} className={!taxRate.isActive ? 'opacity-50' : ''}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {taxRate.name}
                        {taxRate.isDefault && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      {taxRate.description && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {taxRate.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 dark:text-white">{taxTypeLabels[taxRate.taxType]}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 dark:text-white">{taxRate.rate}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 dark:text-white">{taxRate.region || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        taxRate.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200'
                      }`}>
                        {taxRate.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEdit(taxRate)}
                          disabled={updating === taxRate.id}
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          Edit
                        </Button>
                        {!taxRate.isDefault && (
                          <Button
                            onClick={() => handleSetDefault(taxRate.id)}
                            disabled={updating === taxRate.id}
                            variant="ghost"
                            size="sm"
                            className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
                          >
                            Set Default
                          </Button>
                        )}
                        <Button
                          onClick={() => handleToggleActive(taxRate.id, taxRate.isActive)}
                          disabled={updating === taxRate.id}
                          variant="ghost"
                          size="sm"
                          className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300"
                        >
                          {taxRate.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          onClick={() => handleDelete(taxRate.id)}
                          disabled={updating === taxRate.id}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Tax Type Descriptions */}
        <Card padding="lg" className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Tax Types</h2>
          <div className="space-y-3">
            {Object.entries(taxTypeDescriptions).map(([type, description]) => (
              <div key={type}>
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-200">
                  {taxTypeLabels[type as TaxType]}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

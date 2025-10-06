'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'

interface PODetails {
  poNumber: string
  supplierName: string
  totalAmount: string
  currency: string
  expiresAt?: string
}

function InvoiceUploadContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'valid' | 'expired' | 'invalid' | 'uploaded' | 'success' | 'error'>('loading')
  const [poDetails, setPODetails] = useState<PODetails | null>(null)
  const [error, setError] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(false)

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      setError('No upload token provided. Please use the link from your email.')
      return
    }

    const validateToken = async () => {
      try {
        const response = await fetch(`/api/public/po-details?token=${token}`)
        const data = await response.json()

        if (!response.ok) {
          if (response.status === 410) {
            setStatus('expired')
            setError(data.error || 'This upload link has expired.')
          } else if (response.status === 409) {
            setStatus('uploaded')
            setError(data.error || 'An invoice has already been uploaded.')
          } else {
            setStatus('invalid')
            setError(data.error || 'Invalid upload link.')
          }
          return
        }

        setPODetails(data.purchaseOrder)
        setStatus('valid')
      } catch (err) {
        setStatus('error')
        setError('Failed to validate upload link. Please try again.')
      }
    }

    validateToken()
  }, [token])

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a PDF, PNG, or JPG file.')
      return
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setError('File is too large. Maximum size is 10MB.')
      return
    }

    setSelectedFile(file)
    setError('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !token) return

    setUploadProgress(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(`/api/public/invoice-upload?token=${token}`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to upload invoice. Please try again.')
        setUploadProgress(false)
        return
      }

      setStatus('success')
    } catch (err) {
      setError('Failed to upload invoice. Please try again.')
      setUploadProgress(false)
    }
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Validating upload link...</p>
        </div>
      </div>
    )
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invoice Uploaded Successfully!</h1>
          <p className="text-gray-600 mb-4">
            Thank you for submitting your invoice for PO #{poDetails?.poNumber}. We will review it and process payment accordingly.
          </p>
          <p className="text-sm text-gray-500">
            You can now close this page.
          </p>
        </div>
      </div>
    )
  }

  // Error states (expired, invalid, already uploaded)
  if (status === 'expired' || status === 'invalid' || status === 'uploaded') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {status === 'expired' ? 'Link Expired' : status === 'uploaded' ? 'Already Uploaded' : 'Invalid Link'}
          </h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            If you need assistance, please contact the sender of your purchase order.
          </p>
        </div>
      </div>
    )
  }

  // Valid - show upload form
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Submit Your Invoice</h1>
          <p className="text-gray-600 mb-8">
            Please upload your invoice for the purchase order below.
          </p>

          {/* PO Details */}
          {poDetails && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Purchase Order Details</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">PO Number:</span>
                  <span className="font-semibold text-gray-900">{poDetails.poNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Supplier:</span>
                  <span className="font-semibold text-gray-900">{poDetails.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-semibold text-gray-900">
                    {poDetails.currency} {parseFloat(poDetails.totalAmount).toFixed(2)}
                  </span>
                </div>
                {poDetails.expiresAt && (
                  <div className="flex justify-between pt-2 border-t border-blue-200">
                    <span className="text-sm text-gray-500">Link expires:</span>
                    <span className="text-sm text-gray-500">
                      {new Date(poDetails.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* File Upload Area */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice File
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <svg className="w-12 h-12 text-green-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Choose different file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-600">
                    Drag and drop your invoice here, or{' '}
                    <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
                      browse
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileInput}
                      />
                    </label>
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, PNG, or JPG (max 10MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploadProgress}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
              !selectedFile || uploadProgress
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {uploadProgress ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </span>
            ) : (
              'Upload Invoice'
            )}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            By uploading, you confirm that this invoice is for the purchase order shown above.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function InvoiceUploadPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <InvoiceUploadContent />
    </Suspense>
  )
}

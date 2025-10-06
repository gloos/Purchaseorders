/**
 * Tests for POST /api/public/invoice-upload endpoint
 * Tests file upload flow and validation
 */

import { POST } from '@/app/api/public/invoice-upload/route'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    purchaseOrder: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

// Mock Supabase admin client
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

describe('POST /api/public/invoice-upload', () => {
  const validToken = 'valid-token-123'
  const mockPOData = {
    id: 'po-123',
    poNumber: 'PO-2025-001',
    organizationId: 'org-123',
    invoiceUploadTokenExpiresAt: new Date(Date.now() + 86400000), // Tomorrow
    invoiceUrl: null,
  }

  const mockSupabaseStorage = {
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
      })),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createAdminClient as jest.Mock).mockReturnValue(mockSupabaseStorage)
  })

  describe('Token Validation', () => {
    it('should return 400 if no token is provided', async () => {
      const formData = new FormData()
      const request = new NextRequest('http://localhost:3000/api/public/invoice-upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Token is required')
    })

    it('should return 404 if token is invalid', async () => {
      (prisma.purchaseOrder.findUnique as jest.Mock).mockResolvedValue(null)

      const formData = new FormData()
      const file = new File(['test content'], 'invoice.pdf', { type: 'application/pdf' })
      formData.append('file', file)

      const request = new NextRequest(
        `http://localhost:3000/api/public/invoice-upload?token=invalid-token`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('Invalid token')
    })

    it('should return 410 if token has expired', async () => {
      const expiredPO = {
        ...mockPOData,
        invoiceUploadTokenExpiresAt: new Date(Date.now() - 86400000), // Yesterday
      }
      ;(prisma.purchaseOrder.findUnique as jest.Mock).mockResolvedValue(expiredPO)

      const formData = new FormData()
      const file = new File(['test content'], 'invoice.pdf', { type: 'application/pdf' })
      formData.append('file', file)

      const request = new NextRequest(
        `http://localhost:3000/api/public/invoice-upload?token=${validToken}`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(410)
      expect(data.error).toContain('expired')
    })

    it('should return 409 if invoice already uploaded', async () => {
      const uploadedPO = {
        ...mockPOData,
        invoiceUrl: 'path/to/invoice.pdf',
      }
      ;(prisma.purchaseOrder.findUnique as jest.Mock).mockResolvedValue(uploadedPO)

      const formData = new FormData()
      const file = new File(['test content'], 'invoice.pdf', { type: 'application/pdf' })
      formData.append('file', file)

      const request = new NextRequest(
        `http://localhost:3000/api/public/invoice-upload?token=${validToken}`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('already been uploaded')
    })
  })

  describe('File Validation', () => {
    beforeEach(() => {
      (prisma.purchaseOrder.findUnique as jest.Mock).mockResolvedValue(mockPOData)
    })

    it('should return 400 if no file is provided', async () => {
      const formData = new FormData()
      const request = new NextRequest(
        `http://localhost:3000/api/public/invoice-upload?token=${validToken}`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No file provided')
    })

    it('should reject invalid file types', async () => {
      const formData = new FormData()
      const file = new File(['test content'], 'invoice.txt', { type: 'text/plain' })
      formData.append('file', file)

      const request = new NextRequest(
        `http://localhost:3000/api/public/invoice-upload?token=${validToken}`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid file type')
    })

    it('should accept PDF files', async () => {
      const mockUpload = jest.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null })
      mockSupabaseStorage.storage.from = jest.fn(() => ({ upload: mockUpload }))
      ;(prisma.purchaseOrder.update as jest.Mock).mockResolvedValue({})

      const formData = new FormData()
      const file = new File(['test content'], 'invoice.pdf', { type: 'application/pdf' })
      formData.append('file', file)

      const request = new NextRequest(
        `http://localhost:3000/api/public/invoice-upload?token=${validToken}`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should accept PNG files', async () => {
      const mockUpload = jest.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null })
      mockSupabaseStorage.storage.from = jest.fn(() => ({ upload: mockUpload }))
      ;(prisma.purchaseOrder.update as jest.Mock).mockResolvedValue({})

      const formData = new FormData()
      const file = new File(['test content'], 'invoice.png', { type: 'image/png' })
      formData.append('file', file)

      const request = new NextRequest(
        `http://localhost:3000/api/public/invoice-upload?token=${validToken}`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should accept JPG files', async () => {
      const mockUpload = jest.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null })
      mockSupabaseStorage.storage.from = jest.fn(() => ({ upload: mockUpload }))
      ;(prisma.purchaseOrder.update as jest.Mock).mockResolvedValue({})

      const formData = new FormData()
      const file = new File(['test content'], 'invoice.jpg', { type: 'image/jpeg' })
      formData.append('file', file)

      const request = new NextRequest(
        `http://localhost:3000/api/public/invoice-upload?token=${validToken}`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should reject files larger than 10MB', async () => {
      const formData = new FormData()
      // Create a file larger than 10MB
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join('')
      const file = new File([largeContent], 'large-invoice.pdf', { type: 'application/pdf' })
      formData.append('file', file)

      const request = new NextRequest(
        `http://localhost:3000/api/public/invoice-upload?token=${validToken}`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('too large')
      expect(data.error).toContain('10MB')
    })
  })

  describe('Upload Flow', () => {
    beforeEach(() => {
      (prisma.purchaseOrder.findUnique as jest.Mock).mockResolvedValue(mockPOData)
    })

    it('should upload file to Supabase storage', async () => {
      const mockUpload = jest.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null })
      mockSupabaseStorage.storage.from = jest.fn(() => ({ upload: mockUpload }))
      ;(prisma.purchaseOrder.update as jest.Mock).mockResolvedValue({})

      const formData = new FormData()
      const file = new File(['test content'], 'invoice.pdf', { type: 'application/pdf' })
      formData.append('file', file)

      const request = new NextRequest(
        `http://localhost:3000/api/public/invoice-upload?token=${validToken}`,
        {
          method: 'POST',
          body: formData,
        }
      )

      await POST(request)

      expect(mockSupabaseStorage.storage.from).toHaveBeenCalledWith('supplier-invoices')
      expect(mockUpload).toHaveBeenCalled()

      // Check file path structure
      const uploadCall = mockUpload.mock.calls[0]
      const filePath = uploadCall[0] as string
      expect(filePath).toContain(mockPOData.organizationId)
      expect(filePath).toContain(mockPOData.id)
    })

    it('should update PO with invoice details and invalidate token', async () => {
      const mockUpload = jest.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null })
      mockSupabaseStorage.storage.from = jest.fn(() => ({ upload: mockUpload }))
      ;(prisma.purchaseOrder.update as jest.Mock).mockResolvedValue({})

      const formData = new FormData()
      const file = new File(['test content'], 'invoice.pdf', { type: 'application/pdf' })
      formData.append('file', file)

      const request = new NextRequest(
        `http://localhost:3000/api/public/invoice-upload?token=${validToken}`,
        {
          method: 'POST',
          body: formData,
        }
      )

      await POST(request)

      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith({
        where: { id: mockPOData.id },
        data: expect.objectContaining({
          status: 'INVOICED',
          invoiceUploadToken: null,
          invoiceUploadTokenExpiresAt: null,
          invoiceReceivedAt: expect.any(Date),
          invoiceUrl: expect.any(String),
        }),
      })
    })

    it('should return success response with PO number', async () => {
      const mockUpload = jest.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null })
      mockSupabaseStorage.storage.from = jest.fn(() => ({ upload: mockUpload }))
      ;(prisma.purchaseOrder.update as jest.Mock).mockResolvedValue({})

      const formData = new FormData()
      const file = new File(['test content'], 'invoice.pdf', { type: 'application/pdf' })
      formData.append('file', file)

      const request = new NextRequest(
        `http://localhost:3000/api/public/invoice-upload?token=${validToken}`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('successfully')
      expect(data.poNumber).toBe(mockPOData.poNumber)
    })

    it('should handle Supabase upload errors', async () => {
      const mockUpload = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' },
      })
      mockSupabaseStorage.storage.from = jest.fn(() => ({ upload: mockUpload }))

      const formData = new FormData()
      const file = new File(['test content'], 'invoice.pdf', { type: 'application/pdf' })
      formData.append('file', file)

      const request = new NextRequest(
        `http://localhost:3000/api/public/invoice-upload?token=${validToken}`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to upload')
    })

    it('should handle database update errors', async () => {
      const mockUpload = jest.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null })
      mockSupabaseStorage.storage.from = jest.fn(() => ({ upload: mockUpload }))
      ;(prisma.purchaseOrder.update as jest.Mock).mockRejectedValue(
        new Error('Database error')
      )

      const formData = new FormData()
      const file = new File(['test content'], 'invoice.pdf', { type: 'application/pdf' })
      formData.append('file', file)

      const request = new NextRequest(
        `http://localhost:3000/api/public/invoice-upload?token=${validToken}`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to upload')
    })
  })

  describe('File Name Handling', () => {
    it('should sanitize file names with special characters', async () => {
      const mockUpload = jest.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null })
      mockSupabaseStorage.storage.from = jest.fn(() => ({ upload: mockUpload }))
      ;(prisma.purchaseOrder.findUnique as jest.Mock).mockResolvedValue(mockPOData)
      ;(prisma.purchaseOrder.update as jest.Mock).mockResolvedValue({})

      const formData = new FormData()
      const file = new File(['test content'], 'invoice #123 (final).pdf', {
        type: 'application/pdf',
      })
      formData.append('file', file)

      const request = new NextRequest(
        `http://localhost:3000/api/public/invoice-upload?token=${validToken}`,
        {
          method: 'POST',
          body: formData,
        }
      )

      await POST(request)

      const uploadCall = mockUpload.mock.calls[0]
      const filePath = uploadCall[0] as string

      // Should replace special characters with underscores
      expect(filePath).toContain('invoice')
      expect(filePath).not.toContain('#')
      expect(filePath).not.toContain('(')
      expect(filePath).not.toContain(')')
    })
  })
})

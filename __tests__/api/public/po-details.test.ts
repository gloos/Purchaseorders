/**
 * Tests for GET /api/public/po-details endpoint
 * Tests token validation logic for invoice upload
 */

import { GET } from '@/app/api/public/po-details/route'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    purchaseOrder: {
      findUnique: jest.fn(),
    },
  },
}))

describe('GET /api/public/po-details', () => {
  const validToken = 'valid-token-123'
  const mockPOData = {
    id: 'po-123',
    poNumber: 'PO-2025-001',
    supplierName: 'Test Supplier Ltd',
    totalAmount: '1000.00',
    currency: 'GBP',
    invoiceUploadTokenExpiresAt: new Date(Date.now() + 86400000), // Tomorrow
    invoiceUrl: null,
    invoiceReceivedAt: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Token Validation', () => {
    it('should return 400 if no token is provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/public/po-details')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Token is required')
    })

    it('should return 404 if token is invalid', async () => {
      (prisma.purchaseOrder.findUnique as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest(
        `http://localhost:3000/api/public/po-details?token=invalid-token`
      )

      const response = await GET(request)
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

      const request = new NextRequest(
        `http://localhost:3000/api/public/po-details?token=${validToken}`
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(410)
      expect(data.error).toContain('expired')
      expect(data.expiredAt).toBeDefined()
    })

    it('should return 409 if invoice already uploaded', async () => {
      const uploadedPO = {
        ...mockPOData,
        invoiceUrl: 'path/to/invoice.pdf',
        invoiceReceivedAt: new Date(),
      }
      ;(prisma.purchaseOrder.findUnique as jest.Mock).mockResolvedValue(uploadedPO)

      const request = new NextRequest(
        `http://localhost:3000/api/public/po-details?token=${validToken}`
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('already been uploaded')
      expect(data.uploadedAt).toBeDefined()
    })

    it('should return PO details for valid token', async () => {
      (prisma.purchaseOrder.findUnique as jest.Mock).mockResolvedValue(mockPOData)

      const request = new NextRequest(
        `http://localhost:3000/api/public/po-details?token=${validToken}`
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.purchaseOrder).toEqual({
        poNumber: mockPOData.poNumber,
        supplierName: mockPOData.supplierName,
        totalAmount: mockPOData.totalAmount,
        currency: mockPOData.currency,
        expiresAt: mockPOData.invoiceUploadTokenExpiresAt.toISOString(),
      })
    })
  })

  describe('Database Query', () => {
    it('should query with correct token', async () => {
      (prisma.purchaseOrder.findUnique as jest.Mock).mockResolvedValue(mockPOData)

      const request = new NextRequest(
        `http://localhost:3000/api/public/po-details?token=${validToken}`
      )

      await GET(request)

      expect(prisma.purchaseOrder.findUnique).toHaveBeenCalledWith({
        where: { invoiceUploadToken: validToken },
        select: {
          id: true,
          poNumber: true,
          supplierName: true,
          totalAmount: true,
          currency: true,
          invoiceUploadTokenExpiresAt: true,
          invoiceUrl: true,
          invoiceReceivedAt: true,
        },
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle token without expiry date', async () => {
      const poWithoutExpiry = {
        ...mockPOData,
        invoiceUploadTokenExpiresAt: null,
      }
      ;(prisma.purchaseOrder.findUnique as jest.Mock).mockResolvedValue(poWithoutExpiry)

      const request = new NextRequest(
        `http://localhost:3000/api/public/po-details?token=${validToken}`
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle database errors gracefully', async () => {
      (prisma.purchaseOrder.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = new NextRequest(
        `http://localhost:3000/api/public/po-details?token=${validToken}`
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to validate')
    })
  })
})

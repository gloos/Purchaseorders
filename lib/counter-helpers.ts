import { prisma } from '@/lib/prisma'

/**
 * Get the next value for a counter atomically using row-level locking
 * This prevents race conditions when multiple requests generate numbers concurrently
 *
 * @param organizationId - The organization ID
 * @param counterName - The name of the counter (e.g., "po_number")
 * @returns The next counter value
 */
export async function getNextCounterValue(
  organizationId: string,
  counterName: string
): Promise<number> {
  return await prisma.$transaction(async (tx) => {
    // Try to get existing counter with FOR UPDATE lock
    // This locks the row for the duration of the transaction
    const counter = await tx.$queryRaw<Array<{ id: string; value: number }>>`
      SELECT id, value
      FROM counters
      WHERE "organizationId" = ${organizationId}
        AND name = ${counterName}
      FOR UPDATE
    `

    if (counter.length > 0) {
      // Counter exists - increment and return new value
      const newValue = counter[0].value + 1

      await tx.counter.update({
        where: { id: counter[0].id },
        data: { value: newValue }
      })

      return newValue
    } else {
      // Counter doesn't exist - create it with value 1
      const newCounter = await tx.counter.create({
        data: {
          organizationId,
          name: counterName,
          value: 1
        }
      })

      return newCounter.value
    }
  })
}

/**
 * Generate a formatted PO number
 *
 * @param organizationId - The organization ID
 * @param prefix - The prefix for the PO number (default: "PO")
 * @param padding - The number of digits to pad (default: 5)
 * @returns A formatted PO number like "PO-00001"
 */
export async function generatePONumber(
  organizationId: string,
  prefix: string = 'PO',
  padding: number = 5
): Promise<string> {
  const nextValue = await getNextCounterValue(organizationId, 'po_number')
  return `${prefix}-${String(nextValue).padStart(padding, '0')}`
}

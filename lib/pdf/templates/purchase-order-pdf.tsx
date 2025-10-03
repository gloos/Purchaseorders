import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// Currency symbol mapping
const getCurrencySymbol = (currency: string): string => {
  const symbols: Record<string, string> = {
    'GBP': '£',
    'USD': '$',
    'EUR': '€',
    'JPY': '¥',
    'CAD': 'C$',
    'AUD': 'A$'
  }
  return symbols[currency] || currency
}

interface PurchaseOrderPDFProps {
  poNumber: string
  supplierName: string
  supplierEmail?: string
  supplierPhone?: string
  supplierAddress?: string
  orderDate: string
  deliveryDate?: string
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
  currency: string
  subtotal: number
  taxMode: 'NONE' | 'EXCLUSIVE' | 'INCLUSIVE'
  taxRate: number
  tax: number
  total: number
  notes?: string
  terms?: string
  // Company information
  companyName?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  companyVatNumber?: string
  companyRegistrationNumber?: string
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  poNumber: {
    fontSize: 14,
    color: '#555',
    marginBottom: 20,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '2 solid #333',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: '30%',
    fontWeight: 'bold',
  },
  value: {
    width: '70%',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    padding: 8,
    fontWeight: 'bold',
    borderBottom: '2 solid #333',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1 solid #ddd',
  },
  tableColDescription: {
    width: '45%',
  },
  tableColQuantity: {
    width: '15%',
    textAlign: 'right',
  },
  tableColUnitPrice: {
    width: '20%',
    textAlign: 'right',
  },
  tableColTotal: {
    width: '20%',
    textAlign: 'right',
  },
  totalsSection: {
    marginTop: 15,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    width: '40%',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  grandTotalRow: {
    flexDirection: 'row',
    width: '40%',
    justifyContent: 'space-between',
    marginTop: 5,
    paddingTop: 5,
    borderTop: '2 solid #333',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notesSection: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#888',
    fontSize: 8,
    borderTop: '1 solid #ddd',
    paddingTop: 10,
  },
})

export const PurchaseOrderPDF: React.FC<PurchaseOrderPDFProps> = ({
  poNumber,
  supplierName,
  supplierEmail,
  supplierPhone,
  supplierAddress,
  orderDate,
  deliveryDate,
  currency,
  taxMode,
  taxRate,
  items,
  subtotal,
  tax,
  total,
  notes,
  terms,
  companyName,
  companyAddress,
  companyPhone,
  companyEmail,
  companyVatNumber,
  companyRegistrationNumber,
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Company Information Header */}
        {companyName && (
          <View style={styles.section}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 5 }}>{companyName}</Text>
            {companyAddress && <Text style={{ fontSize: 9, color: '#666', marginBottom: 2 }}>{companyAddress}</Text>}
            <View style={{ flexDirection: 'row', fontSize: 9, color: '#666', marginBottom: 2 }}>
              {companyPhone && <Text style={{ marginRight: 10 }}>Tel: {companyPhone}</Text>}
              {companyEmail && <Text>Email: {companyEmail}</Text>}
            </View>
            <View style={{ flexDirection: 'row', fontSize: 9, color: '#666' }}>
              {companyRegistrationNumber && <Text style={{ marginRight: 10 }}>Reg: {companyRegistrationNumber}</Text>}
              {companyVatNumber && <Text>VAT: {companyVatNumber}</Text>}
            </View>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Purchase Order</Text>
          <Text style={styles.poNumber}>PO #{poNumber}</Text>
        </View>

        {/* Order Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Order Date:</Text>
            <Text style={styles.value}>{new Date(orderDate).toLocaleDateString()}</Text>
          </View>
          {deliveryDate && (
            <View style={styles.row}>
              <Text style={styles.label}>Delivery Date:</Text>
              <Text style={styles.value}>{new Date(deliveryDate).toLocaleDateString()}</Text>
            </View>
          )}
        </View>

        {/* Supplier Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Supplier Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Supplier:</Text>
            <Text style={styles.value}>{supplierName}</Text>
          </View>
          {supplierEmail && (
            <View style={styles.row}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{supplierEmail}</Text>
            </View>
          )}
          {supplierPhone && (
            <View style={styles.row}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{supplierPhone}</Text>
            </View>
          )}
          {supplierAddress && (
            <View style={styles.row}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{supplierAddress}</Text>
            </View>
          )}
        </View>

        {/* Line Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Line Items</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableColDescription}>Description</Text>
              <Text style={styles.tableColQuantity}>Quantity</Text>
              <Text style={styles.tableColUnitPrice}>Unit Price</Text>
              <Text style={styles.tableColTotal}>Total</Text>
            </View>
            {items.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableColDescription}>{item.description}</Text>
                <Text style={styles.tableColQuantity}>{item.quantity}</Text>
                <Text style={styles.tableColUnitPrice}>{getCurrencySymbol(currency)}{item.unitPrice.toFixed(2)}</Text>
                <Text style={styles.tableColTotal}>{getCurrencySymbol(currency)}{item.total.toFixed(2)}</Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text>{getCurrencySymbol(currency)}{subtotal.toFixed(2)}</Text>
            </View>
            {taxMode !== 'NONE' && taxRate > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax ({taxRate.toFixed(2)}% {taxMode === 'INCLUSIVE' ? 'incl.' : 'excl.'}):</Text>
                <Text>{getCurrencySymbol(currency)}{tax.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text>Total:</Text>
              <Text>{getCurrencySymbol(currency)}{total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text>{notes}</Text>
          </View>
        )}

        {/* Terms */}
        {terms && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
            <Text>{terms}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>This is a computer-generated purchase order</Text>
        </View>
      </Page>
    </Document>
  )
}

export default PurchaseOrderPDF

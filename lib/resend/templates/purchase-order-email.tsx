import * as React from 'react'

interface PurchaseOrderEmailProps {
  poNumber: string
  supplierName: string
  orderDate: string
  deliveryDate?: string
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
  subtotal: number
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
  companyLogoUrl?: string
}

export const PurchaseOrderEmail: React.FC<PurchaseOrderEmailProps> = ({
  poNumber,
  supplierName,
  orderDate,
  deliveryDate,
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
  companyLogoUrl,
}) => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        {/* Company Header */}
        {companyName && (
          <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
              {companyLogoUrl && (
                <img src={companyLogoUrl} alt={companyName} style={{ maxHeight: '60px', maxWidth: '150px', objectFit: 'contain' }} />
              )}
              <div>
                <h2 style={{ margin: '0 0 5px 0', color: '#1e293b', fontSize: '20px' }}>{companyName}</h2>
                {companyAddress && <p style={{ margin: '2px 0', fontSize: '12px', color: '#64748b' }}>{companyAddress}</p>}
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {companyPhone && <span style={{ marginRight: '15px' }}>Tel: {companyPhone}</span>}
                  {companyEmail && <span>Email: {companyEmail}</span>}
                </div>
                {(companyRegistrationNumber || companyVatNumber) && (
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                    {companyRegistrationNumber && <span style={{ marginRight: '15px' }}>Reg: {companyRegistrationNumber}</span>}
                    {companyVatNumber && <span>VAT: {companyVatNumber}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h1 style={{ color: '#1e293b', marginTop: '0' }}>Purchase Order</h1>
          <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#475569' }}>PO #{poNumber}</p>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ color: '#1e293b', fontSize: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>Supplier Information</h2>
          <p><strong>Supplier:</strong> {supplierName}</p>
          <p><strong>Order Date:</strong> {new Date(orderDate).toLocaleDateString()}</p>
          {deliveryDate && <p><strong>Requested Delivery Date:</strong> {new Date(deliveryDate).toLocaleDateString()}</p>}
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ color: '#1e293b', fontSize: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>Line Items</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Description</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Quantity</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Unit Price</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px' }}>{item.description}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>£{item.unitPrice.toFixed(2)}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>£{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginBottom: '30px', textAlign: 'right' }}>
          <table style={{ marginLeft: 'auto', minWidth: '300px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px', textAlign: 'right' }}><strong>Subtotal:</strong></td>
                <td style={{ padding: '8px', textAlign: 'right' }}>£{subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', textAlign: 'right' }}><strong>Tax (20%):</strong></td>
                <td style={{ padding: '8px', textAlign: 'right' }}>£{tax.toFixed(2)}</td>
              </tr>
              <tr style={{ borderTop: '2px solid #1e293b' }}>
                <td style={{ padding: '8px', textAlign: 'right', fontSize: '18px' }}><strong>Total:</strong></td>
                <td style={{ padding: '8px', textAlign: 'right', fontSize: '18px' }}><strong>£{total.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        {notes && (
          <div style={{ marginBottom: '20px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
            <h3 style={{ color: '#1e293b', fontSize: '14px', marginTop: '0' }}>Notes</h3>
            <p style={{ margin: '0', whiteSpace: 'pre-wrap' }}>{notes}</p>
          </div>
        )}

        {terms && (
          <div style={{ marginBottom: '20px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
            <h3 style={{ color: '#1e293b', fontSize: '14px', marginTop: '0' }}>Terms & Conditions</h3>
            <p style={{ margin: '0', whiteSpace: 'pre-wrap' }}>{terms}</p>
          </div>
        )}

        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </body>
    </html>
  )
}

export default PurchaseOrderEmail

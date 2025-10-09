/**
 * FreeAgent API Supported Currencies
 *
 * This list matches the currencies supported by FreeAgent API.
 * Source: https://dev.freeagent.com/docs/currencies
 *
 * All currencies use ISO 4217 three-letter codes.
 */

export interface Currency {
  code: string
  name: string
  symbol?: string
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'AED', name: 'United Arab Emirates Dirham', symbol: 'د.إ' },
  { code: 'AMD', name: 'Armenian Dram', symbol: '֏' },
  { code: 'AOA', name: 'Angolan Kwanza', symbol: 'Kz' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: '$' },
  { code: 'AWG', name: 'Aruban Florin', symbol: 'ƒ' },
  { code: 'AZN', name: 'Azerbaijani Manat', symbol: '₼' },
  { code: 'BBD', name: 'Barbadian Dollar', symbol: '$' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв' },
  { code: 'BRL', name: 'Brazil Real', symbol: 'R$' },
  { code: 'BWP', name: 'Botswana Pula', symbol: 'P' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: '$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$' },
  { code: 'CRC', name: 'Costa Rican Colones', symbol: '₡' },
  { code: 'CUC', name: 'Cuban Convertible Peso', symbol: '$' },
  { code: 'CUP', name: 'Cuban Peso', symbol: '$' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'DKK', name: 'Danish Kroner', symbol: 'kr' },
  { code: 'DOP', name: 'Dominican Peso', symbol: '$' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: '£' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'FJD', name: 'Fijian Dollar', symbol: '$' },
  { code: 'GBP', name: 'Pounds Sterling', symbol: '£' },
  { code: 'GEL', name: 'Georgian Lari', symbol: '₾' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
  { code: 'GTQ', name: 'Guatemalan Quetzales', symbol: 'Q' },
  { code: 'GYD', name: 'Guyanese Dollar', symbol: '$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: '$' },
  { code: 'HNL', name: 'Honduran Lempira', symbol: 'L' },
  { code: 'HRK', name: 'Croatian Kuna', symbol: 'kn' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'ILS', name: 'Israeli Sheckels', symbol: '₪' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr' },
  { code: 'JMD', name: 'Jamaican Dollar', symbol: '$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك' },
  { code: 'KYD', name: 'Caymanian Dollar', symbol: '$' },
  { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸' },
  { code: 'LAK', name: 'Lao Kip', symbol: '₭' },
  { code: 'LBP', name: 'Lebanese Pound', symbol: '£' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs' },
  { code: 'LTL', name: 'Lithuanian Lita', symbol: 'Lt' },
  { code: 'LVL', name: 'Latvian Lats', symbol: 'Ls' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.' },
  { code: 'MDL', name: 'Moldovan Leu', symbol: 'L' },
  { code: 'MGA', name: 'Malagasy Ariary', symbol: 'Ar' },
  { code: 'MUR', name: 'Mauritian Rupee', symbol: '₨' },
  { code: 'MVR', name: 'Maldivian Rufiyaa', symbol: 'Rf' },
  { code: 'MWK', name: 'Malawian Kwacha', symbol: 'MK' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'MZN', name: 'Mozambican Metical', symbol: 'MT' },
  { code: 'NAD', name: 'Namibian Dollar', symbol: '$' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'NOK', name: 'Norwegian Kroner', symbol: 'kr' },
  { code: 'NPR', name: 'Nepalese Rupees', symbol: '₨' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: '$' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع.' },
  { code: 'PEN', name: 'Peruvian Nuevo Sol', symbol: 'S/' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق' },
  { code: 'RSD', name: 'Serbian Dinar', symbol: 'дин' },
  { code: 'RUB', name: 'Russian Rouble', symbol: '₽' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'Fr' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س' },
  { code: 'SCR', name: 'Seychelles Rupee', symbol: '₨' },
  { code: 'SEK', name: 'Swedish Kronor', symbol: 'kr' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: '$' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'TND', name: 'Tunisian Dinar', symbol: 'د.ت' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'TTD', name: 'Trinidad and Tobago Dollar', symbol: '$' },
  { code: 'TWD', name: 'New Taiwan Dollar', symbol: '$' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'UYU', name: 'Uruguayan Peso', symbol: '$' },
  { code: 'VEF', name: 'Venezuelan Bolívar', symbol: 'Bs' },
  { code: 'VND', name: 'Vietnamese đồng', symbol: '₫' },
  { code: 'VUV', name: 'Vanuatu Vatu', symbol: 'VT' },
  { code: 'XAF', name: 'Central African CFA Franc', symbol: 'Fr' },
  { code: 'XCD', name: 'East Carribean Dollar', symbol: '$' },
  { code: 'XOF', name: 'West African CFA Franc', symbol: 'Fr' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'ZMK', name: 'Zambian Kwacha', symbol: 'ZK' },
]

/**
 * Get currency by code
 */
export function getCurrency(code: string): Currency | undefined {
  return SUPPORTED_CURRENCIES.find(c => c.code === code)
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(code: string): string {
  const currency = getCurrency(code)
  return currency?.symbol || code
}

/**
 * Format amount with currency
 */
export function formatCurrency(amount: number | string, currencyCode: string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  const currency = getCurrency(currencyCode)

  if (!currency) {
    return `${currencyCode} ${numAmount.toFixed(2)}`
  }

  // For currencies without decimal places (e.g., JPY, KRW)
  const decimals = ['JPY', 'KRW', 'VND', 'CLP', 'ISK'].includes(currencyCode) ? 0 : 2

  return `${currency.symbol || currencyCode} ${numAmount.toFixed(decimals)}`
}

/**
 * Get array of currency codes for validation
 */
export const CURRENCY_CODES = SUPPORTED_CURRENCIES.map(c => c.code)

/**
 * Check if currency code is supported
 */
export function isSupportedCurrency(code: string): boolean {
  return CURRENCY_CODES.includes(code)
}

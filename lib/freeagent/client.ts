// FreeAgent API Client
// Documentation: https://dev.freeagent.com/docs/quick_start

const FREEAGENT_API_URL = 'https://api.freeagent.com/v2'
const FREEAGENT_AUTH_URL = 'https://api.freeagent.com/v2/approve_app'
const FREEAGENT_TOKEN_URL = 'https://api.freeagent.com/v2/token_endpoint'

export interface FreeAgentTokens {
  access_token: string
  refresh_token: string
  expires_in: number
}

export interface FreeAgentContact {
  url: string
  organisation_name?: string
  first_name?: string
  last_name?: string
  email?: string
  phone_number?: string
  address1?: string
  address2?: string
  address3?: string
  town?: string
  region?: string
  postcode?: string
  country?: string
  contact_name_on_invoices?: boolean
  is_active?: boolean
}

export interface FreeAgentCategory {
  url: string
  description: string
  nominal_code?: string
  allowable_for_tax?: boolean
  auto_sales_tax_rate?: number
}

export interface FreeAgentBillItem {
  url?: string // Empty string for new items, URL for existing
  description: string
  total_value: string
  sales_tax_rate?: string
  category: string
  stock_item?: string
  stock_altering_quantity?: string
}

export interface FreeAgentBill {
  url?: string
  contact: string
  reference?: string
  dated_on: string // ISO date YYYY-MM-DD
  due_on: string // ISO date YYYY-MM-DD
  bill_items: FreeAgentBillItem[]
  currency?: string
  exchange_rate?: string
  rebill_type?: string
  rebill_factor?: string
  rebill_to_project?: string
  total_value?: string
  sales_tax_value?: string
  status?: string
  created_at?: string
  updated_at?: string
}

export class FreeAgentClient {
  private accessToken: string

  constructor(accessToken: string, _refreshToken?: string) {
    this.accessToken = accessToken
  }

  // Generate OAuth authorization URL
  static getAuthorizationUrl(redirectUri: string, clientId: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri
    })
    return `${FREEAGENT_AUTH_URL}?${params.toString()}`
  }

  // Exchange authorization code for access token
  static async getAccessToken(
    code: string,
    redirectUri: string,
    clientId: string,
    clientSecret: string
  ): Promise<FreeAgentTokens> {
    const response = await fetch(FREEAGENT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get access token: ${error}`)
    }

    return response.json()
  }

  // Refresh access token
  static async refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<FreeAgentTokens> {
    const response = await fetch(FREEAGENT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to refresh access token: ${error}`)
    }

    return response.json()
  }

  // Make authenticated API request with retry logic for rate limits
  private async request(endpoint: string, options: RequestInit = {}, retries = 3): Promise<any> {
    const response = await fetch(`${FREEAGENT_API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    // Handle rate limiting with exponential backoff
    if (response.status === 429 && retries > 0) {
      const retryAfter = response.headers.get('Retry-After')
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000 // Default 5s

      console.warn(`FreeAgent rate limit hit, waiting ${waitTime}ms before retry...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))

      return this.request(endpoint, options, retries - 1)
    }

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`FreeAgent API error (${response.status}): ${error}`)
    }

    return response.json()
  }

  // Get all contacts (handles pagination)
  async getContacts(): Promise<FreeAgentContact[]> {
    const allContacts: FreeAgentContact[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const response = await this.request(`/contacts?page=${page}&per_page=100`)
      const contacts = response.contacts || []

      if (contacts.length > 0) {
        allContacts.push(...contacts)
        page++

        // If we got fewer than 100, we're on the last page
        if (contacts.length < 100) {
          hasMore = false
        }
      } else {
        hasMore = false
      }
    }

    return allContacts
  }

  // Get a single contact
  async getContact(contactUrl: string): Promise<FreeAgentContact> {
    const response = await this.request(contactUrl.replace(FREEAGENT_API_URL, ''))
    return response.contact
  }

  // Create a contact
  async createContact(contact: Partial<FreeAgentContact>): Promise<FreeAgentContact> {
    const response = await this.request('/contacts', {
      method: 'POST',
      body: JSON.stringify({ contact })
    })
    return response.contact
  }

  // Update a contact
  async updateContact(contactUrl: string, contact: Partial<FreeAgentContact>): Promise<FreeAgentContact> {
    const response = await this.request(contactUrl.replace(FREEAGENT_API_URL, ''), {
      method: 'PUT',
      body: JSON.stringify({ contact })
    })
    return response.contact
  }

  // Get company information
  async getCompany(): Promise<any> {
    const response = await this.request('/company')
    return response.company
  }

  // Get all expense categories
  async getCategories(includeSubAccounts: boolean = true): Promise<{
    admin_expenses_categories: FreeAgentCategory[]
    cost_of_sales_categories: FreeAgentCategory[]
    income_categories: FreeAgentCategory[]
    general_categories: FreeAgentCategory[]
  }> {
    const endpoint = includeSubAccounts ? '/categories?sub_accounts=true' : '/categories'
    const response = await this.request(endpoint)
    return response
  }

  // Create a bill in FreeAgent
  async createBill(billData: Partial<FreeAgentBill>): Promise<FreeAgentBill> {
    const response = await this.request('/bills', {
      method: 'POST',
      body: JSON.stringify({ bill: billData })
    })
    return response.bill
  }

  // Get a single bill
  async getBill(billUrl: string): Promise<FreeAgentBill> {
    const response = await this.request(billUrl.replace(FREEAGENT_API_URL, ''))
    return response.bill
  }

  // Find contact by email
  async findContactByEmail(email: string): Promise<FreeAgentContact | null> {
    const contacts = await this.getContacts()
    return contacts.find(c => c.email?.toLowerCase() === email.toLowerCase()) || null
  }

  // Find contact by name (fuzzy match)
  async findContactByName(name: string): Promise<FreeAgentContact | null> {
    const contacts = await this.getContacts()
    const normalizedName = name.toLowerCase().trim()

    return contacts.find(c => {
      const orgName = c.organisation_name?.toLowerCase().trim()
      const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().trim()
      return orgName === normalizedName || fullName === normalizedName
    }) || null
  }

  // Create contact if it doesn't exist, otherwise return existing
  async ensureContact(contactData: Partial<FreeAgentContact>): Promise<FreeAgentContact> {
    // Try to find existing contact by email first
    if (contactData.email) {
      const existing = await this.findContactByEmail(contactData.email)
      if (existing) return existing
    }

    // Try to find by organization name
    if (contactData.organisation_name) {
      const existing = await this.findContactByName(contactData.organisation_name)
      if (existing) return existing
    }

    // Create new contact
    return await this.createContact(contactData)
  }
}

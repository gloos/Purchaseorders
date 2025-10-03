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

export class FreeAgentClient {
  private accessToken: string
  private refreshToken?: string

  constructor(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
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

  // Make authenticated API request
  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${FREEAGENT_API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`FreeAgent API error: ${error}`)
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
}

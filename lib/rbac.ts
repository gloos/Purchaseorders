import { UserRole } from '@prisma/client'
import { prisma } from './prisma'

// Permission definitions for each role
export const PERMISSIONS = {
  SUPER_ADMIN: {
    // User management
    canManageUsers: true,
    canInviteUsers: true,
    canRemoveUsers: true,
    canChangeUserRoles: true,

    // Organization settings
    canManageOrganization: true,
    canConnectIntegrations: true,

    // Purchase orders
    canCreatePO: true,
    canEditPO: true,
    canDeletePO: true,
    canApprovePO: true,
    canSendPO: true,
    canViewPO: true,

    // Contacts
    canSyncContacts: true,
    canManageContacts: true,
  },
  ADMIN: {
    // User management
    canManageUsers: true,
    canInviteUsers: true,
    canRemoveUsers: true,
    canChangeUserRoles: true,

    // Organization settings
    canManageOrganization: true,
    canConnectIntegrations: true,

    // Purchase orders
    canCreatePO: true,
    canEditPO: true,
    canDeletePO: true,
    canApprovePO: true,
    canSendPO: true,
    canViewPO: true,

    // Contacts
    canSyncContacts: true,
    canManageContacts: true,
  },
  MANAGER: {
    // User management
    canManageUsers: false,
    canInviteUsers: false,
    canRemoveUsers: false,
    canChangeUserRoles: false,

    // Organization settings
    canManageOrganization: false,
    canConnectIntegrations: false,

    // Purchase orders
    canCreatePO: true,
    canEditPO: true,
    canDeletePO: true,
    canApprovePO: true,
    canSendPO: true,
    canViewPO: true,

    // Contacts
    canSyncContacts: true,
    canManageContacts: false,
  },
  VIEWER: {
    // User management
    canManageUsers: false,
    canInviteUsers: false,
    canRemoveUsers: false,
    canChangeUserRoles: false,

    // Organization settings
    canManageOrganization: false,
    canConnectIntegrations: false,

    // Purchase orders
    canCreatePO: false,
    canEditPO: false,
    canDeletePO: false,
    canApprovePO: false,
    canSendPO: false,
    canViewPO: true,

    // Contacts
    canSyncContacts: false,
    canManageContacts: false,
  },
} as const

export type Permission = keyof typeof PERMISSIONS.ADMIN

/**
 * Check if a user has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return PERMISSIONS[role][permission]
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission))
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission))
}

/**
 * Get user role by user ID
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  return user?.role || null
}

/**
 * Check if a user is an admin (includes SUPER_ADMIN)
 */
export function isAdmin(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN'
}

/**
 * Check if a user is a manager or higher
 */
export function isManagerOrHigher(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'MANAGER'
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole) {
  return PERMISSIONS[role]
}

/**
 * Authorization error
 */
export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

/**
 * Require a specific permission (throws if not authorized)
 */
export function requirePermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new AuthorizationError(`Required permission: ${permission}`)
  }
}

/**
 * Require admin role (throws if not admin)
 */
export function requireAdmin(role: UserRole): void {
  if (!isAdmin(role)) {
    throw new AuthorizationError('Admin access required')
  }
}

/**
 * Require manager or higher (throws if not manager or admin)
 */
export function requireManagerOrHigher(role: UserRole): void {
  if (!isManagerOrHigher(role)) {
    throw new AuthorizationError('Manager or Admin access required')
  }
}

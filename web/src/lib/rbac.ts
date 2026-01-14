/**
 * RBAC Engine - Role-Based Access Control
 * 
 * Implements deny-by-default permission model:
 * - All routes are denied unless explicitly allowed
 * - Roles have specific permissions
 * - Permissions are action-based (e.g., BITACORA:READ, MAIL:SEND)
 * 
 * OWASP Top 10 #1: Broken Access Control - This is the primary defense
 * 
 * @module rbac
 */

import type { Session, UserRole } from './types';

// =============================================================================
// Permission Definitions
// =============================================================================

/**
 * All available permissions in the system
 */
export type Permission =
    // Bitácora permissions
    | 'BITACORA:READ'
    | 'BITACORA:WRITE'
    | 'BITACORA:DELETE'
    // Mail permissions
    | 'MAIL:READ'
    | 'MAIL:SEND'
    | 'MAIL:TEMPLATES:READ'
    | 'MAIL:TEMPLATES:WRITE'
    // EECC permissions
    | 'EECC:READ'
    | 'EECC:GENERATE'
    | 'EECC:EXPORT'
    // Grupos permissions
    | 'GRUPOS:READ'
    | 'GRUPOS:WRITE'
    // Dashboard permissions
    | 'DASHBOARD:READ'
    | 'DASHBOARD:ADMIN'
    // Admin permissions
    | 'ADMIN:USERS'
    | 'ADMIN:SYSTEM'
    | '*'; // Superadmin wildcard

/**
 * Role to Permission mapping
 * Deny-by-default: If a permission is not listed, access is denied
 */
const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
    ADMIN: ['*'], // Full access

    COBRANZAS: [
        'BITACORA:READ',
        'BITACORA:WRITE',
        'MAIL:READ',
        'MAIL:SEND',
        'MAIL:TEMPLATES:READ',
        'EECC:READ',
        'EECC:GENERATE',
        'EECC:EXPORT',
        'GRUPOS:READ',
        'DASHBOARD:READ',
    ],

    SUPERVISOR: [
        'BITACORA:READ',
        'BITACORA:WRITE',
        'MAIL:READ',
        'MAIL:SEND',
        'MAIL:TEMPLATES:READ',
        'EECC:READ',
        'EECC:GENERATE',
        'EECC:EXPORT',
        'GRUPOS:READ',
        'DASHBOARD:READ',
        'DASHBOARD:ADMIN',
    ],

    LECTURA: [
        'BITACORA:READ',
        'EECC:READ',
        'GRUPOS:READ',
        'DASHBOARD:READ',
    ],

    COMERCIAL: [
        'BITACORA:READ',
        'EECC:READ',
        'GRUPOS:READ',
    ],

    RRHH: [
        'BITACORA:READ',
        'DASHBOARD:READ',
    ],
} as const;

// =============================================================================
// Permission Checking
// =============================================================================

/**
 * Check if a role has a specific permission
 * Deny-by-default: returns false if permission not explicitly granted
 */
export function roleHasPermission(role: UserRole, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[role];

    if (!permissions) {
        return false; // Unknown role = deny
    }

    // Check for wildcard
    if (permissions.includes('*')) {
        return true;
    }

    // Check for exact permission
    if (permissions.includes(permission)) {
        return true;
    }

    // Check for namespace wildcard (e.g., BITACORA:* matches BITACORA:READ)
    const namespace = permission.split(':')[0];
    const wildcardPerm = `${namespace}:*` as Permission;
    if (permissions.includes(wildcardPerm)) {
        return true;
    }

    return false; // Deny by default
}

/**
 * Check if a session has a specific permission
 */
export function hasPermission(session: Session | null, permission: Permission): boolean {
    if (!session) {
        return false;
    }

    return roleHasPermission(session.user.role, permission);
}

/**
 * Check if session has any of the given permissions
 */
export function hasAnyPermission(session: Session | null, permissions: Permission[]): boolean {
    return permissions.some(p => hasPermission(session, p));
}

/**
 * Check if session has all of the given permissions
 */
export function hasAllPermissions(session: Session | null, permissions: Permission[]): boolean {
    return permissions.every(p => hasPermission(session, p));
}

// =============================================================================
// Permission Enforcement (Throws on Failure)
// =============================================================================

/**
 * RBAC Error for unauthorized access
 */
export class RBACError extends Error {
    constructor(
        message: string,
        public code: 'UNAUTHORIZED' | 'FORBIDDEN',
        public permission?: Permission,
        public role?: UserRole
    ) {
        super(message);
        this.name = 'RBACError';
    }
}

/**
 * Require session to be authenticated
 * Throws UNAUTHORIZED if not logged in
 */
export function requireAuth(session: Session | null): asserts session is Session {
    if (!session) {
        throw new RBACError(
            'Authentication required',
            'UNAUTHORIZED'
        );
    }
}

/**
 * Require session to have a specific permission
 * Throws FORBIDDEN if permission denied
 */
export function requirePermission(session: Session | null, permission: Permission): void {
    requireAuth(session);

    if (!roleHasPermission(session.user.role, permission)) {
        throw new RBACError(
            `Permission denied: ${permission}`,
            'FORBIDDEN',
            permission,
            session.user.role
        );
    }
}

/**
 * Require session to have any of the given permissions
 */
export function requireAnyPermission(session: Session | null, permissions: Permission[]): void {
    requireAuth(session);

    if (!hasAnyPermission(session, permissions)) {
        throw new RBACError(
            `Permission denied: requires one of [${permissions.join(', ')}]`,
            'FORBIDDEN',
            permissions[0],
            session.user.role
        );
    }
}

/**
 * Require admin role
 */
export function requireAdmin(session: Session | null): void {
    requireAuth(session);

    if (session.user.role !== 'ADMIN') {
        throw new RBACError(
            'Admin access required',
            'FORBIDDEN',
            'ADMIN:SYSTEM',
            session.user.role
        );
    }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): readonly Permission[] {
    return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if role is admin
 */
export function isAdminRole(role: UserRole): boolean {
    return role === 'ADMIN';
}

/**
 * Get human-readable permission name
 */
export function getPermissionLabel(permission: Permission): string {
    const labels: Record<Permission, string> = {
        'BITACORA:READ': 'Ver Bitácora',
        'BITACORA:WRITE': 'Editar Bitácora',
        'BITACORA:DELETE': 'Eliminar de Bitácora',
        'MAIL:READ': 'Ver Cola de Correos',
        'MAIL:SEND': 'Enviar Correos',
        'MAIL:TEMPLATES:READ': 'Ver Plantillas',
        'MAIL:TEMPLATES:WRITE': 'Editar Plantillas',
        'EECC:READ': 'Ver EECC',
        'EECC:GENERATE': 'Generar EECC',
        'EECC:EXPORT': 'Exportar EECC',
        'GRUPOS:READ': 'Ver Grupos',
        'GRUPOS:WRITE': 'Editar Grupos',
        'DASHBOARD:READ': 'Ver Dashboard',
        'DASHBOARD:ADMIN': 'Dashboard Admin',
        'ADMIN:USERS': 'Gestionar Usuarios',
        'ADMIN:SYSTEM': 'Configuración Sistema',
        '*': 'Acceso Total',
    };

    return labels[permission] || permission;
}

// =============================================================================
// API Route Helper
// =============================================================================

/**
 * Create an RBAC-protected API handler
 * Automatically checks permissions and returns 401/403 on failure
 */
export function withRBAC<T>(
    permission: Permission,
    handler: (session: Session) => Promise<T>
) {
    return async (session: Session | null): Promise<{ ok: boolean; data?: T; error?: { code: string; message: string } }> => {
        try {
            requirePermission(session, permission);
            const data = await handler(session as Session);
            return { ok: true, data };
        } catch (error) {
            if (error instanceof RBACError) {
                return {
                    ok: false,
                    error: {
                        code: error.code,
                        message: error.message,
                    },
                };
            }
            throw error;
        }
    };
}

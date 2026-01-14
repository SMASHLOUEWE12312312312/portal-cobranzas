/**
 * Audit Logging
 * 
 * Logs security-relevant events for compliance and debugging.
 * Uses structured logging format with correlationId for tracing.
 * 
 * @module audit
 */

import type { Session } from './types';
import type { Permission } from './rbac';

// =============================================================================
// Types
// =============================================================================

export interface AuditEvent {
    timestamp: string;
    correlationId: string;
    event: AuditEventType;
    userId?: string;
    role?: string;
    ip?: string;
    userAgent?: string;
    resource?: string;
    action?: string;
    permission?: Permission;
    result: 'success' | 'denied' | 'error';
    details?: Record<string, unknown>;
}

export type AuditEventType =
    | 'auth.login'
    | 'auth.logout'
    | 'auth.session_expired'
    | 'auth.session_refresh'
    | 'rbac.permission_check'
    | 'rbac.access_denied'
    | 'api.request'
    | 'api.error'
    | 'data.read'
    | 'data.write'
    | 'data.delete';

// =============================================================================
// Audit Logger
// =============================================================================

/**
 * Log an audit event
 * In production, this would send to a log aggregator
 */
export function logAudit(event: Omit<AuditEvent, 'timestamp'>): void {
    const auditEvent: AuditEvent = {
        ...event,
        timestamp: new Date().toISOString(),
    };

    // Structured log output (JSON for easy parsing)
    console.log(JSON.stringify({
        level: event.result === 'error' ? 'error' : event.result === 'denied' ? 'warn' : 'info',
        type: 'audit',
        ...auditEvent,
    }));
}

/**
 * Log a successful login
 */
export function logLogin(session: Session, correlationId: string): void {
    logAudit({
        correlationId,
        event: 'auth.login',
        userId: session.user.username,
        role: session.user.role,
        result: 'success',
    });
}

/**
 * Log a logout
 */
export function logLogout(userId: string, correlationId: string): void {
    logAudit({
        correlationId,
        event: 'auth.logout',
        userId,
        result: 'success',
    });
}

/**
 * Log an access denied event
 */
export function logAccessDenied(
    session: Session | null,
    permission: Permission,
    resource: string,
    correlationId: string
): void {
    logAudit({
        correlationId,
        event: 'rbac.access_denied',
        userId: session?.user.username,
        role: session?.user.role,
        permission,
        resource,
        result: 'denied',
    });
}

/**
 * Log a permission check
 */
export function logPermissionCheck(
    session: Session,
    permission: Permission,
    granted: boolean,
    correlationId: string
): void {
    logAudit({
        correlationId,
        event: 'rbac.permission_check',
        userId: session.user.username,
        role: session.user.role,
        permission,
        result: granted ? 'success' : 'denied',
    });
}

/**
 * Log an API error
 */
export function logApiError(
    error: Error,
    resource: string,
    correlationId: string,
    session?: Session | null
): void {
    logAudit({
        correlationId,
        event: 'api.error',
        userId: session?.user.username,
        role: session?.user.role,
        resource,
        result: 'error',
        details: {
            errorName: error.name,
            errorMessage: error.message,
        },
    });
}

/**
 * GAS Client - Secure proxy to Google Apps Script backend
 * 
 * Implements P0 mandatory adjustments:
 * - P0-1: HMAC signature authentication (GAS doesn't expose headers)
 * - P0-2: Uses BFF_SHARED_SECRET (separate from API_SECRET)
 * - P0-3: Handles 302 redirects preserving method and body
 * 
 * @module gas-client
 */

import { createHmac, randomUUID } from 'crypto';
import type { ApiResponse, GASAction, GASRequestPayload } from './types';

// =============================================================================
// Configuration
// =============================================================================

const GAS_BASE_URL = process.env.GAS_BASE_URL;
const BFF_SHARED_SECRET = process.env.BFF_SHARED_SECRET;
const DEFAULT_TIMEOUT_MS = 30000;

// =============================================================================
// Error Types
// =============================================================================

export class GASClientError extends Error {
    constructor(
        message: string,
        public code: string,
        public correlationId: string,
        public statusCode?: number
    ) {
        super(message);
        this.name = 'GASClientError';
    }
}

// =============================================================================
// HMAC Signature Generation (P0-1)
// =============================================================================

/**
 * Generate HMAC-SHA256 signature for request payload
 * This is used instead of headers since GAS doPost doesn't expose them
 */
function generateSignature(payload: string): string {
    if (!BFF_SHARED_SECRET) {
        throw new GASClientError(
            'BFF_SHARED_SECRET not configured',
            'CONFIG_ERROR',
            'N/A'
        );
    }

    return createHmac('sha256', BFF_SHARED_SECRET)
        .update(payload)
        .digest('hex');
}

/**
 * Generate unique correlation ID for request tracing
 */
function generateCorrelationId(): string {
    return `bff-${Date.now()}-${randomUUID().substring(0, 8)}`;
}

// =============================================================================
// Main Client Function
// =============================================================================

/**
 * Call GAS backend with HMAC authentication and 302 redirect handling
 * 
 * @param action - The GAS function to call
 * @param params - Parameters to pass to the function
 * @param token - Optional auth token (for authenticated endpoints)
 * @param options - Request options (timeout, etc.)
 * @returns Normalized API response
 */
export async function callGAS<T = unknown>(
    action: GASAction,
    params: Record<string, unknown> = {},
    token?: string,
    options: { timeoutMs?: number } = {}
): Promise<ApiResponse<T>> {
    const correlationId = generateCorrelationId();
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    // Validate configuration
    if (!GAS_BASE_URL) {
        return {
            ok: false,
            correlationId,
            error: {
                code: 'CONFIG_ERROR',
                message: 'GAS_BASE_URL not configured',
            },
        };
    }

    try {
        // Build request payload with anti-replay fields (P0-1)
        const requestPayload: GASRequestPayload = {
            action,
            params,
            token,
            timestamp: Date.now(),
            nonce: randomUUID(),
            correlationId,
        };

        const payloadString = JSON.stringify(requestPayload);
        const signature = generateSignature(payloadString);

        // Request body includes payload + signature
        const body = JSON.stringify({
            payload: payloadString,
            signature,
        });

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            // Initial request with redirect: 'manual' (P0-3)
            let response = await fetch(GAS_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body,
                redirect: 'manual', // Don't auto-follow redirects
                signal: controller.signal,
            });

            // Handle 302 redirect - GAS Web Apps commonly return these (P0-3)
            if (response.status === 302 || response.status === 301) {
                const location = response.headers.get('Location');

                if (location) {
                    // Retry to the redirect location, preserving method and body
                    response = await fetch(location, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body, // Preserve original body
                        redirect: 'follow',
                        signal: controller.signal,
                    });
                }
            }

            clearTimeout(timeoutId);

            // Handle non-OK responses
            if (!response.ok) {
                return {
                    ok: false,
                    correlationId,
                    error: {
                        code: `HTTP_${response.status}`,
                        message: `GAS returned status ${response.status}`,
                    },
                };
            }

            // Parse response
            const text = await response.text();

            // GAS sometimes returns HTML error pages
            if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
                return {
                    ok: false,
                    correlationId,
                    error: {
                        code: 'INVALID_RESPONSE',
                        message: 'GAS returned HTML instead of JSON',
                    },
                };
            }

            const data = JSON.parse(text) as ApiResponse<T>;

            // Ensure correlationId is always present
            return {
                ...data,
                correlationId: data.correlationId || correlationId,
            };

        } finally {
            clearTimeout(timeoutId);
        }

    } catch (error) {
        // Handle specific error types
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                return {
                    ok: false,
                    correlationId,
                    error: {
                        code: 'TIMEOUT',
                        message: `Request timed out after ${timeoutMs}ms`,
                    },
                };
            }

            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                return {
                    ok: false,
                    correlationId,
                    error: {
                        code: 'NETWORK_ERROR',
                        message: 'Network error connecting to GAS',
                    },
                };
            }

            if (error instanceof SyntaxError) {
                return {
                    ok: false,
                    correlationId,
                    error: {
                        code: 'PARSE_ERROR',
                        message: 'Failed to parse GAS response',
                    },
                };
            }
        }

        // Generic error fallback
        return {
            ok: false,
            correlationId,
            error: {
                code: 'UNKNOWN_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
        };
    }
}

// =============================================================================
// Convenience Wrappers
// =============================================================================

/**
 * Call GAS endpoint that requires authentication
 */
export async function callGASAuthenticated<T = unknown>(
    action: GASAction,
    params: Record<string, unknown>,
    token: string,
    options?: { timeoutMs?: number }
): Promise<ApiResponse<T>> {
    if (!token) {
        return {
            ok: false,
            correlationId: generateCorrelationId(),
            error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication token required',
            },
        };
    }

    return callGAS<T>(action, params, token, options);
}

/**
 * Health check - verify GAS connectivity
 */
export async function checkGASConnection(): Promise<{
    connected: boolean;
    latencyMs: number;
    error?: string;
}> {
    const start = Date.now();

    try {
        const response = await callGAS('ping', {}, undefined, { timeoutMs: 5000 });
        const latencyMs = Date.now() - start;

        return {
            connected: response.ok,
            latencyMs,
            error: response.error?.message,
        };
    } catch {
        return {
            connected: false,
            latencyMs: Date.now() - start,
            error: 'Connection failed',
        };
    }
}

// =============================================================================
// Environment Validation
// =============================================================================

/**
 * Validate that required environment variables are set
 * Call this during app initialization
 */
export function validateGASConfig(): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    if (!GAS_BASE_URL) missing.push('GAS_BASE_URL');
    if (!BFF_SHARED_SECRET) missing.push('BFF_SHARED_SECRET');

    return {
        valid: missing.length === 0,
        missing,
    };
}

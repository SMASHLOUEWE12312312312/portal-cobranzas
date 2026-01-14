/**
 * Type definitions for Portal Cobranzas BFF
 * @module types
 */

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Standard API response envelope
 * All BFF and GAS responses follow this contract
 */
export interface ApiResponse<T = unknown> {
    ok: boolean;
    data?: T;
    error?: ApiError;
    correlationId: string;
    pagination?: Pagination;
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

export interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
}

// =============================================================================
// Auth Types
// =============================================================================

export interface User {
    username: string;
    role: UserRole;
    displayName?: string;
    email?: string;
}

export type UserRole =
    | 'ADMIN'
    | 'COBRANZAS'
    | 'SUPERVISOR'
    | 'LECTURA'
    | 'COMERCIAL'
    | 'RRHH';

export interface Session {
    user: User;
    token: string;
    expiresAt: number;
    createdAt: number;
}

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface LoginResponse {
    user: User;
    expiresAt: number;
}

// =============================================================================
// Bitácora Types
// =============================================================================

export interface Ciclo {
    idCiclo: string;
    asegurado: string;
    ruc?: string;
    responsable: string;
    tipoGestion: TipoGestion;
    estadoGestion: EstadoGestion;
    canalContacto?: CanalContacto;
    fechaRegistro: string;
    fechaCompromiso?: string;
    proximaAccion?: string;
    observaciones?: string;
    diasDesdeRegistro: number;
}

export interface Gestion {
    idGestion: string;
    idCiclo: string;
    asegurado: string;
    ruc?: string;
    responsable: string;
    tipoGestion: TipoGestion;
    estadoGestion: EstadoGestion;
    canalContacto?: CanalContacto;
    fechaRegistro: string;
    fechaCompromiso?: string;
    proximaAccion?: string;
    observaciones?: string;
}

export type TipoGestion =
    | 'ENVIO_EECC'
    | 'LLAMADA'
    | 'WHATSAPP'
    | 'CORREO_INDIVIDUAL'
    | 'REUNION'
    | 'OTRO';

export type EstadoGestion =
    | 'SIN_RESPUESTA'
    | 'EN_SEGUIMIENTO'
    | 'COMPROMISO_PAGO'
    | 'REPROGRAMADO'
    | 'DERIVADO_COMERCIAL'
    | 'DERIVADO_RRHH'
    | 'DERIVADO_RIESGOS_GENERALES'
    | 'CERRADO_PAGADO'
    | 'NO_COBRABLE'
    | 'NO_CONTACTABLE';

export type CanalContacto =
    | 'EMAIL'
    | 'LLAMADA'
    | 'WHATSAPP'
    | 'REUNION'
    | 'OTRO';

export interface BitacoraFilters {
    asegurado?: string;
    estadoGestion?: EstadoGestion;
    responsable?: string;
    diasMin?: number;
    diasMax?: number;
}

export interface GestionInput {
    idCiclo?: string;
    asegurado: string;
    ruc?: string;
    tipoGestion: TipoGestion;
    estadoGestion: EstadoGestion;
    canalContacto?: CanalContacto;
    fechaCompromiso?: string;
    proximaAccion?: string;
    observaciones?: string;
}

// =============================================================================
// Mail Types
// =============================================================================

export interface MailQueueItem {
    id: string;
    asegurado: string;
    status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
    createdAt: string;
    processedAt?: string;
    error?: string;
}

export interface MailQueueHealth {
    pending: number;
    processing: number;
    staleCount: number;
    oldestPending?: string;
}

export interface SendMailRequest {
    items: Array<{ aseguradoId: string }>;
    options?: {
        template?: string;
        subject?: string;
    };
}

export interface SendMailResponse {
    sent: number;
    failed: number;
    errors: string[];
    details: Array<{
        asegurado: string;
        status: 'sent' | 'failed';
        error?: string;
    }>;
}

// =============================================================================
// EECC Types
// =============================================================================

export interface Asegurado {
    nombre: string;
    ruc?: string;
    grupo?: string;
}

export interface EECCPreview {
    asegurado: string;
    rows: number;
    totalImporte: number;
    moneda: string;
    data: Array<Record<string, unknown>>;
}

export interface GenerateEECCRequest {
    asegurado: string;
    options?: {
        exportPdf?: boolean;
        exportXlsx?: boolean;
        includeObs?: boolean;
        obsForRAM?: boolean;
        rowsToSkip?: number;
    };
}

export interface GenerateEECCResponse {
    success: boolean;
    files: Array<{
        name: string;
        url: string;
        type: 'pdf' | 'xlsx';
    }>;
}

// =============================================================================
// GAS Client Types
// =============================================================================

export type GASAction =
    | 'ping'
    | 'loginPassword'
    | 'logout'
    | 'validateSession'
    | 'getBitacoraResumen'
    | 'registrarGestionManualBitacora'
    | 'bitacoraGetGestionesPorCiclo'
    | 'getClientesConCiclosActivos'
    | 'getMailQueueHealth'
    | 'sendEmailsNow'
    | 'getMailTemplates'
    | 'previewAsegurado'
    | 'generateForAsegurado_API'
    | 'getGrupos_API'
    | 'getAseguradosPorGrupo_API'
    | 'getDashboardStats';

export interface GASRequestPayload {
    action: GASAction;
    params: Record<string, unknown>;
    token?: string;
    timestamp: number;
    nonce: string;
    correlationId: string;
}

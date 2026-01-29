/**
 * Type definitions for Portal Cobranzas BFF
 * @module types
 * @version 2.0.0 - Complete types for Vercel migration
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
    hasMore?: boolean;
    hasNext?: boolean;
    hasPrev?: boolean;
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
    token: string;
    user: User;
    expiresAt: number;
}

// =============================================================================
// Dashboard Types
// =============================================================================

export interface DashboardStats {
    eeccToday: number;
    eeccWeek: number;
    mailSent24h: number;
    mailQueued: number;
    errors24h: number;
    lastUpdated: string;
}

export interface MailQueueHealth {
    pending: number;
    processing: number;
    failed24h: number;
    staleCount: number;
    oldestPending?: string;
    lastProcessed?: string;
    status: 'OK' | 'WARNING' | 'ERROR';
    reasons?: string[];
}

// =============================================================================
// Bitácora Types
// =============================================================================

export interface Ciclo {
    idCiclo: string;
    idGestion?: string;
    origenRegistro?: string;
    asegurado: string;
    ruc?: string;
    responsable: string;
    tipoGestion: TipoGestion;
    estadoGestion: EstadoGestion;
    canalContacto?: CanalContacto;
    fechaEnvioEECC?: string;
    fechaRegistro: string;
    fechaCompromiso?: string;
    proximaAccion?: string;
    observaciones?: string;
    diasDesdeRegistro: number;
    numGestiones?: number;
    snapshotVencidoPEN?: number;
    snapshotVencidoUSD?: number;
}

export interface Gestion {
    idGestion: string;
    idCiclo: string;
    origenRegistro?: string;
    asegurado: string;
    ruc?: string;
    responsable: string;
    tipoGestion: TipoGestion;
    estadoGestion: EstadoGestion;
    canalContacto?: CanalContacto;
    fechaEnvioEECC?: string;
    fechaRegistro: string;
    fechaCompromiso?: string;
    proximaAccion?: string;
    observaciones?: string;
    snapshotVencidoPEN?: number;
    snapshotVencidoUSD?: number;
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
    fechaEnvioEECC?: string;
    fechaGestion?: string;
    fechaCompromiso?: string;
    proximaAccion?: string;
    observaciones?: string;
}

export interface CompromisoActivo {
    idCiclo: string;
    asegurado: string;
    fechaCompromiso: string;
    estadoGestion: EstadoGestion;
    tipoGestion: TipoGestion;
    responsable: string;
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

export interface MailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
    active: boolean;
}

export interface SendMailRequest {
    items: Array<{ aseguradoId: string }>;
    options?: {
        templateId?: string;
        adjuntarPdf?: boolean;
        adjuntarXlsx?: boolean;
        fechaCorte?: string;
    };
}

export interface SendMailResponse {
    sent: number;
    failed: number;
    errors: Array<{ aseguradoId: string; error: string }>;
    details: Array<{
        aseguradoId: string;
        status: 'sent' | 'error' | 'queued';
        messageId?: string;
        error?: string;
    }>;
    correlationId: string;
    queued?: boolean;
    metrics?: {
        totalMs: number;
        loadContactsMs?: number;
        sendEmailsMs?: number;
    };
}

export interface ScheduleJobRequest {
    tipo: 'EECC_INDIVIDUAL' | 'EECC_GRUPO' | 'EECC_BATCH';
    destino: string | string[];
    fecha: string;
    hora: string;
    options?: Record<string, unknown>;
}

// =============================================================================
// EECC Types
// =============================================================================

export interface Asegurado {
    nombre: string;
    ruc?: string;
    grupo?: string;
}

export interface GrupoEconomico {
    nombre: string;
    asegurados: string[];
    count: number;
}

export interface PreviewData {
    headers: string[];
    rows: Array<Array<string | number | null>>;
    total: number;
    rams: string[];
}

export interface GenerateEECCOptions {
    exportPdf?: boolean;
    exportXlsx?: boolean;
    includeObs?: boolean;
    obsForRAM?: string | string[];
    rowsToSkip?: number[];
}

export interface GenerateEECCResponse {
    ok: boolean;
    pdfUrl?: string;
    xlsxUrl?: string;
    pipelineId?: string;
    error?: string;
}

export interface ZipResponse {
    ok: boolean;
    url?: string;
    error?: string;
}

// =============================================================================
// Base/Upload Types
// =============================================================================

export interface UploadPayload {
    dataBase64: string;
    name: string;
    mimeType: string;
    tieneEncabezado: boolean;
}

export interface UploadResponse {
    ok: boolean;
    filas?: number;
    mensaje: string;
    duplicatesRemoved?: number;
    t?: { total: number };
}

// =============================================================================
// Conciliación Types
// =============================================================================

export interface Insurer {
    key: string;
    name: string;
    enabled: boolean;
}

export interface ConciliacionStatus {
    ok: boolean;
    loaded: boolean;
    rows?: number;
    lastUpdated?: string;
    error?: string;
}

export interface ConciliacionResult {
    ok: boolean;
    stats?: {
        totalRows: number;
        matched: number;
        unmatched: number;
    };
    cruce?: {
        encontrados: number;
        noEncontrados: number;
    };
    exports?: {
        cruceUrl?: string;
        reportUrl?: string;
    };
    error?: string;
}

// =============================================================================
// GAS Client Types
// =============================================================================

/**
 * Complete list of GAS actions supported by doPost
 * @version 5.0.0
 */
export type GASAction =
    // Auth
    | 'ping'
    | 'login'
    | 'loginPassword'
    | 'logout'
    | 'validateSession'
    | 'healthCheck'
    // Dashboard
    | 'getDashboardStats'
    | 'getMailQueueHealth'
    // Base/Upload
    | 'subirArchivoBase'
    // EECC/Generar
    | 'getAseguradosSafe'
    | 'getAseguradosPaged'
    | 'getGrupos_API'
    | 'getAseguradosPorGrupo_API'
    | 'previewAsegurado'
    | 'generateForAsegurado_API'
    | 'generateHeadless_API'
    | 'generateByGrupo_API'
    | 'createZip_API'
    // Mail/Enviar
    | 'getMailTemplates'
    | 'sendEmailsNow'
    | 'sendTestEmail'
    | 'queueEmailsBatch_API'
    | 'listGrupos'
    | 'sendEmailsByGrupo_API'
    | 'scheduleJob_API'
    // Bitácora
    | 'getBitacoraResumen'
    | 'bitacoraGetGestionesPorCiclo'
    | 'registrarGestionManualBitacora'
    | 'getClientesConCiclosActivos'
    | 'getUltimoCicloPorAsegurado'
    | 'getResponsablesUnicos'
    | 'bitacoraGetResumenCiclos'
    | 'bitacoraGetGestionesPorAsegurado'
    | 'bitacoraGetCompromisosActivos'
    | 'getGestionesCiclo' // Legacy alias
    // Conciliación
    | 'conciliacion.getInsurers'
    | 'conciliacion.getStatus'
    | 'conciliacion.uploadBDSisnet'
    | 'conciliacion.process';

export interface GASRequestPayload {
    action: GASAction;
    params: Record<string, unknown>;
    token?: string;
    timestamp: number;
    nonce: string;
    correlationId: string;
}

// =============================================================================
// UI State Types
// =============================================================================

export interface NavItem {
    id: string;
    label: string;
    icon: string;
    href: string;
}

export interface ToastMessage {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
}

export interface ModalState {
    isOpen: boolean;
    title?: string;
    content?: React.ReactNode;
}

/**
 * Bitacora enum values - Single source of truth for validation.
 * Must stay in sync with gas/config.js BITACORA.TIPOS_GESTION, ESTADOS, CANALES.
 */

export const VALID_TIPOS_GESTION = [
    'ENVIO_EECC',
    'LLAMADA',
    'WHATSAPP',
    'CORREO_INDIVIDUAL',
    'REUNION',
    'OTRO',
] as const;

export const VALID_ESTADOS_GESTION = [
    'SIN_RESPUESTA',
    'EN_SEGUIMIENTO',
    'COMPROMISO_PAGO',
    'REPROGRAMADO',
    'DERIVADO_COMERCIAL',
    'DERIVADO_RRHH',
    'DERIVADO_RIESGOS_GENERALES',
    'CERRADO_PAGADO',
    'NO_COBRABLE',
    'NO_CONTACTABLE',
] as const;

export const VALID_CANALES_CONTACTO = [
    'EMAIL',
    'LLAMADA',
    'WHATSAPP',
    'REUNION',
    'OTRO',
] as const;

export type TipoGestion = typeof VALID_TIPOS_GESTION[number];
export type EstadoGestion = typeof VALID_ESTADOS_GESTION[number];
export type CanalContacto = typeof VALID_CANALES_CONTACTO[number];

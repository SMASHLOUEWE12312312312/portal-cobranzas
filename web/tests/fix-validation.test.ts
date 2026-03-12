/**
 * Tests de validación para las correcciones aplicadas:
 * 1. Notificaciones: timeout de seguridad + payload reducido
 * 2. Conciliación: checkLogin removido + timeout 300s + no retry en timeouts
 * 3. _parseDate: no retorna Invalid Date
 */

import * as fs from 'fs';
import * as path from 'path';

const GAS_DIR = path.resolve(__dirname, '../../gas');
const indexHtml = fs.readFileSync(path.join(GAS_DIR, 'index.html'), 'utf-8');
const portalApi = fs.readFileSync(path.join(GAS_DIR, 'portal_api.js'), 'utf-8');
const bitacoraV3 = fs.readFileSync(path.join(GAS_DIR, 'bitacora_v3.js'), 'utf-8');

// ============================================================
// FIX 1: Notificaciones - timeout de seguridad
// ============================================================
describe('Fix: Notificaciones no se quedan cargando infinitamente', () => {

    test('cargarNotificaciones debe tener timeout de seguridad', () => {
        // Debe existir un setTimeout como fallback
        const fnMatch = indexHtml.match(/function cargarNotificaciones[\s\S]*?^        \}/m);
        expect(fnMatch).not.toBeNull();
        const fnBody = fnMatch![0];
        expect(fnBody).toContain('setTimeout');
        expect(fnBody).toContain('responded');
        // No debe quedar girando para siempre - debe tener mecanismo de escape
        expect(fnBody).toContain('Reintentar');
    });

    test('inicializarNotificaciones debe usar helper con timeout', () => {
        // Debe usar _fetchCompromisosConTimeout en vez de google.script.run directo
        const fnMatch = indexHtml.match(/function inicializarNotificaciones[\s\S]*?^        \}/m);
        expect(fnMatch).not.toBeNull();
        const fnBody = fnMatch![0];
        expect(fnBody).toContain('_fetchCompromisosConTimeout');
        // No debe tener google.script.run directo (sin timeout)
        expect(fnBody).not.toContain('google.script.run');
    });

    test('_fetchCompromisosConTimeout debe existir con timeout configurable', () => {
        expect(indexHtml).toContain('function _fetchCompromisosConTimeout');
        const fnMatch = indexHtml.match(/function _fetchCompromisosConTimeout[\s\S]*?^        \}/m);
        expect(fnMatch).not.toBeNull();
        const fnBody = fnMatch![0];
        expect(fnBody).toContain('setTimeout');
        expect(fnBody).toContain('responded');
        expect(fnBody).toContain('clearTimeout');
    });
});

// ============================================================
// FIX 2: Payload reducido en bitacoraGetCompromisosActivos
// ============================================================
describe('Fix: Payload reducido en notificaciones', () => {

    test('bitacoraGetCompromisosActivos NO debe usar spread (...c) del objeto completo', () => {
        const fnMatch = portalApi.match(/function bitacoraGetCompromisosActivos[\s\S]*?^}/m);
        expect(fnMatch).not.toBeNull();
        const fnBody = fnMatch![0];
        // No debe tener ...c que copia todos los 16+ campos
        expect(fnBody).not.toContain('...c,');
        expect(fnBody).not.toContain('...c\n');
    });

    test('debe retornar solo campos necesarios para el frontend', () => {
        const fnMatch = portalApi.match(/function bitacoraGetCompromisosActivos[\s\S]*?^}/m);
        expect(fnMatch).not.toBeNull();
        const fnBody = fnMatch![0];
        // Campos que SÍ necesita el frontend
        expect(fnBody).toContain('asegurado:');
        expect(fnBody).toContain('fechaCompromiso:');
        expect(fnBody).toContain('tipoGestion:');
        expect(fnBody).toContain('estadoGestion:');
        // No debe incluir campos pesados innecesarios
        expect(fnBody).not.toContain('observaciones');
        expect(fnBody).not.toContain('proximaAccion');
    });
});

// ============================================================
// FIX 3: _parseDate no retorna Invalid Date
// ============================================================
describe('Fix: _parseDate no retorna Invalid Date', () => {

    test('fallback de _parseDate debe validar resultado', () => {
        const fnMatch = bitacoraV3.match(/_parseDate\(value\)[\s\S]*?\},/);
        expect(fnMatch).not.toBeNull();
        const fnBody = fnMatch![0];
        // El fallback debe verificar isNaN
        expect(fnBody).toContain('isNaN(fallback.getTime())');
        // No debe tener "return new Date(value)" sin validación
        const lines = fnBody.split('\n');
        const fallbackLines = lines.filter(l => l.includes('return new Date(') && !l.includes('isNaN'));
        expect(fallbackLines.length).toBe(0);
    });

    test('conversión de número a Date debe validar resultado', () => {
        const fnMatch = bitacoraV3.match(/_parseDate\(value\)[\s\S]*?\},/);
        const fnBody = fnMatch![0];
        // Debe validar dates creados desde números
        expect(fnBody).toContain("isNaN(d.getTime())");
    });
});

// ============================================================
// FIX 4: checkLogin removido
// ============================================================
describe('Fix: checkLogin ReferenceError eliminado', () => {

    test('no debe haber llamadas a checkLogin() en index.html', () => {
        // Buscar llamadas a checkLogin (no definiciones ni comentarios)
        const calls = indexHtml.match(/[^/]\bcheckLogin\s*\(\s*\)/g);
        expect(calls).toBeNull();
    });
});

// ============================================================
// FIX 5: Conciliación - timeout aumentado a 300s
// ============================================================
describe('Fix: Conciliación timeout suficiente para BD grandes', () => {

    test('callServerAsync debe tener timeout >= 300s', () => {
        const fnMatch = indexHtml.match(/function callServerAsync[\s\S]*?^        \}/m);
        expect(fnMatch).not.toBeNull();
        const fnBody = fnMatch![0];
        const timeoutMatch = fnBody.match(/TIMEOUT_MS\s*=\s*(\d+)/);
        expect(timeoutMatch).not.toBeNull();
        const timeoutMs = parseInt(timeoutMatch![1]);
        expect(timeoutMs).toBeGreaterThanOrEqual(300000); // >= 5 minutos
    });
});

// ============================================================
// FIX 6: executeWithRetry NO reintenta timeouts
// ============================================================
describe('Fix: No reintentar en timeout (evita lock contention)', () => {

    test('executeWithRetry debe excluir timeouts de reintentos', () => {
        const fnMatch = indexHtml.match(/function executeWithRetry[\s\S]*?^        \}/m);
        expect(fnMatch).not.toBeNull();
        const fnBody = fnMatch![0];
        // Debe detectar timeouts explícitamente
        expect(fnBody).toContain('isTimeout');
        // Debe excluir timeouts de la lógica de retry
        expect(fnBody).toContain('!isTimeout');
    });

    test('mensaje de error no debe decir siempre "después de 3 reintentos"', () => {
        // El catch handler de conciliación no debe mentir sobre reintentos
        const catchBlocks = indexHtml.match(/catch\s*\(\s*error\s*\)\s*\{[^}]*conciliacionLog[^}]*\}/g);
        if (catchBlocks) {
            catchBlocks.forEach(block => {
                expect(block).not.toContain('después de 3 reintentos');
            });
        }
    });
});

/**
 * BitacoraService.registrarGestionMasiva — decision table logic
 *
 * Mirrors the decision matrix in gas/bitacora_v3.js so refactors that
 * change the meaning of the four states break the suite. The pure logic
 * is replicated here because the live function depends on the GAS
 * runtime (SpreadsheetApp, CacheService, Logger, etc.).
 *
 * Decision matrix:
 *   ┌─────────────────────┬──────────────┬──────────────────────────────────┐
 *   │ Estado actual        │ ¿Tiene deuda?│ Acción                           │
 *   ├─────────────────────┼──────────────┼──────────────────────────────────┤
 *   │ NO_COBRABLE          │ —            │ NO TOCAR (siempre)               │
 *   │ CERRADO_PAGADO       │ SÍ           │ → EN_SEGUIMIENTO (reactivar)     │
 *   │ CERRADO_PAGADO       │ NO           │ NO TOCAR                         │
 *   │ Cualquier otro       │ NO           │ → CERRADO_PAGADO                 │
 *   │ Cualquier otro       │ SÍ           │ → mantener estado + snapshot     │
 *   └─────────────────────┴──────────────┴──────────────────────────────────┘
 */

type Estado =
    | 'NO_COBRABLE'
    | 'CERRADO_PAGADO'
    | 'EN_SEGUIMIENTO'
    | 'SIN_RESPUESTA'
    | 'COMPROMISO_PAGO'
    | 'REPROGRAMADO';

type Accion =
    | 'NO_TOCAR'
    | 'REACTIVAR_EN_SEGUIMIENTO'
    | 'CERRAR_PAGADO'
    | 'MANTENER_SNAPSHOT';

function decidir(estado: Estado, snapPEN: number, snapUSD: number): Accion {
    const tieneDeuda = snapPEN > 0 || snapUSD > 0;
    if (estado === 'NO_COBRABLE') return 'NO_TOCAR';
    if (estado === 'CERRADO_PAGADO' && !tieneDeuda) return 'NO_TOCAR';
    if (estado === 'CERRADO_PAGADO' && tieneDeuda) return 'REACTIVAR_EN_SEGUIMIENTO';
    if (estado !== 'CERRADO_PAGADO' && !tieneDeuda) return 'CERRAR_PAGADO';
    return 'MANTENER_SNAPSHOT';
}

describe('registrarGestionMasiva: decision matrix', () => {
    it('NO_COBRABLE nunca se toca, tenga o no deuda', () => {
        expect(decidir('NO_COBRABLE', 0, 0)).toBe('NO_TOCAR');
        expect(decidir('NO_COBRABLE', 1000, 0)).toBe('NO_TOCAR');
        expect(decidir('NO_COBRABLE', 0, 500)).toBe('NO_TOCAR');
    });

    it('CERRADO_PAGADO sin deuda no se toca', () => {
        expect(decidir('CERRADO_PAGADO', 0, 0)).toBe('NO_TOCAR');
    });

    it('CERRADO_PAGADO con deuda PEN reactiva a EN_SEGUIMIENTO', () => {
        expect(decidir('CERRADO_PAGADO', 100, 0)).toBe('REACTIVAR_EN_SEGUIMIENTO');
    });

    it('CERRADO_PAGADO con deuda USD reactiva a EN_SEGUIMIENTO', () => {
        expect(decidir('CERRADO_PAGADO', 0, 100)).toBe('REACTIVAR_EN_SEGUIMIENTO');
    });

    it('estado activo sin deuda se cierra como CERRADO_PAGADO', () => {
        expect(decidir('EN_SEGUIMIENTO', 0, 0)).toBe('CERRAR_PAGADO');
        expect(decidir('SIN_RESPUESTA', 0, 0)).toBe('CERRAR_PAGADO');
        expect(decidir('COMPROMISO_PAGO', 0, 0)).toBe('CERRAR_PAGADO');
        expect(decidir('REPROGRAMADO', 0, 0)).toBe('CERRAR_PAGADO');
    });

    it('estado activo con deuda mantiene estado y actualiza snapshot', () => {
        expect(decidir('EN_SEGUIMIENTO', 500, 0)).toBe('MANTENER_SNAPSHOT');
        expect(decidir('SIN_RESPUESTA', 0, 200)).toBe('MANTENER_SNAPSHOT');
        expect(decidir('COMPROMISO_PAGO', 100, 100)).toBe('MANTENER_SNAPSHOT');
    });

    it('snapshots negativos o cero NO cuentan como deuda', () => {
        // El código real usa `vencidoPEN > 0 || vencidoUSD > 0`
        expect(decidir('EN_SEGUIMIENTO', 0, 0)).toBe('CERRAR_PAGADO');
        expect(decidir('EN_SEGUIMIENTO', -10, -5)).toBe('CERRAR_PAGADO');
    });
});

/**
 * _calcularSnapshotsMasivos: 1 pasada por BD con expansión de grupos.
 * Replicamos la lógica de acumulación pura para evitar regresiones.
 */
type BDRow = {
    asegurado: string;
    importe: number;
    moneda: 'PEN' | 'USD' | string;
    fecVenc: Date;
};

function calcularSnapshotsMasivos(
    asegurados: string[],
    bdRows: BDRow[],
    grupoMap: Record<string, string[]> = {},
    hoy: Date = new Date(),
): Record<string, { vencidoPEN: number; vencidoUSD: number }> {
    const clean = (s: string) => String(s || '').trim().toUpperCase();

    const miembroToGrupo: Record<string, string> = {};
    const aseguradosSet = new Set<string>();
    const resultados: Record<string, { vencidoPEN: number; vencidoUSD: number }> = {};

    for (const nombre of asegurados) {
        const key = clean(nombre);
        resultados[key] = { vencidoPEN: 0, vencidoUSD: 0 };
        if (grupoMap[key]) {
            for (const miembro of grupoMap[key]) {
                const mKey = clean(miembro);
                aseguradosSet.add(mKey);
                miembroToGrupo[mKey] = key;
            }
            aseguradosSet.add(key);
        } else {
            aseguradosSet.add(key);
        }
    }

    const hoy0 = new Date(hoy);
    hoy0.setHours(0, 0, 0, 0);

    for (const row of bdRows) {
        const aseg = clean(row.asegurado);
        if (!aseguradosSet.has(aseg)) continue;

        const fv = new Date(row.fecVenc);
        fv.setHours(0, 0, 0, 0);
        if (fv >= hoy0) continue;
        if (!(row.importe > 0)) continue;

        const moneda = String(row.moneda || 'PEN').toUpperCase();
        const esUSD = moneda.includes('USD') || moneda.includes('US$') ||
            moneda.includes('DOLAR') || moneda.includes('DOLLAR');

        const target = miembroToGrupo[aseg] || aseg;
        if (!resultados[target]) continue;
        if (esUSD) resultados[target].vencidoUSD += row.importe;
        else resultados[target].vencidoPEN += row.importe;
    }

    for (const k of Object.keys(resultados)) {
        resultados[k].vencidoPEN = Math.round(resultados[k].vencidoPEN * 100) / 100;
        resultados[k].vencidoUSD = Math.round(resultados[k].vencidoUSD * 100) / 100;
    }
    return resultados;
}

describe('_calcularSnapshotsMasivos: accumulation logic', () => {
    const hoy = new Date('2026-05-12T00:00:00');
    const ayer = new Date('2026-05-11T00:00:00');
    const manana = new Date('2026-05-13T00:00:00');

    it('acumula vencido en moneda PEN', () => {
        const res = calcularSnapshotsMasivos(
            ['ACME'],
            [
                { asegurado: 'ACME', importe: 100, moneda: 'PEN', fecVenc: ayer },
                { asegurado: 'ACME', importe: 50, moneda: 'PEN', fecVenc: ayer },
            ],
            {},
            hoy,
        );
        expect(res['ACME']).toEqual({ vencidoPEN: 150, vencidoUSD: 0 });
    });

    it('acumula vencido en USD y PEN por separado', () => {
        const res = calcularSnapshotsMasivos(
            ['ACME'],
            [
                { asegurado: 'ACME', importe: 100, moneda: 'PEN', fecVenc: ayer },
                { asegurado: 'ACME', importe: 30, moneda: 'USD', fecVenc: ayer },
            ],
            {},
            hoy,
        );
        expect(res['ACME']).toEqual({ vencidoPEN: 100, vencidoUSD: 30 });
    });

    it('ignora cupones no vencidos (fecha >= hoy)', () => {
        const res = calcularSnapshotsMasivos(
            ['ACME'],
            [
                { asegurado: 'ACME', importe: 100, moneda: 'PEN', fecVenc: manana },
                { asegurado: 'ACME', importe: 50, moneda: 'PEN', fecVenc: hoy },
            ],
            {},
            hoy,
        );
        expect(res['ACME']).toEqual({ vencidoPEN: 0, vencidoUSD: 0 });
    });

    it('ignora asegurados que no están en la lista pedida', () => {
        const res = calcularSnapshotsMasivos(
            ['ACME'],
            [{ asegurado: 'OTRO', importe: 999, moneda: 'PEN', fecVenc: ayer }],
            {},
            hoy,
        );
        expect(res['ACME']).toEqual({ vencidoPEN: 0, vencidoUSD: 0 });
        expect(res['OTRO']).toBeUndefined();
    });

    it('expande grupos: BD trae nombre del miembro, snapshot se acumula al grupo', () => {
        const res = calcularSnapshotsMasivos(
            ['GRUPO_X'],
            [
                { asegurado: 'MIEMBRO_A', importe: 100, moneda: 'PEN', fecVenc: ayer },
                { asegurado: 'MIEMBRO_B', importe: 200, moneda: 'PEN', fecVenc: ayer },
            ],
            { GRUPO_X: ['MIEMBRO_A', 'MIEMBRO_B'] },
            hoy,
        );
        expect(res['GRUPO_X']).toEqual({ vencidoPEN: 300, vencidoUSD: 0 });
    });

    it('detecta USD por variantes de etiqueta de moneda', () => {
        const res = calcularSnapshotsMasivos(
            ['A', 'B', 'C', 'D'],
            [
                { asegurado: 'A', importe: 10, moneda: 'USD', fecVenc: ayer },
                { asegurado: 'B', importe: 10, moneda: 'US$', fecVenc: ayer },
                { asegurado: 'C', importe: 10, moneda: 'DOLAR', fecVenc: ayer },
                { asegurado: 'D', importe: 10, moneda: 'DOLLAR', fecVenc: ayer },
            ],
            {},
            hoy,
        );
        expect(res['A'].vencidoUSD).toBe(10);
        expect(res['B'].vencidoUSD).toBe(10);
        expect(res['C'].vencidoUSD).toBe(10);
        expect(res['D'].vencidoUSD).toBe(10);
    });

    it('redondea a 2 decimales', () => {
        const res = calcularSnapshotsMasivos(
            ['A'],
            [
                { asegurado: 'A', importe: 0.1, moneda: 'PEN', fecVenc: ayer },
                { asegurado: 'A', importe: 0.2, moneda: 'PEN', fecVenc: ayer },
            ],
            {},
            hoy,
        );
        // 0.1 + 0.2 = 0.30000000000000004; debe redondear a 0.3
        expect(res['A'].vencidoPEN).toBe(0.3);
    });

    it('ignora importes <= 0', () => {
        const res = calcularSnapshotsMasivos(
            ['A'],
            [
                { asegurado: 'A', importe: 0, moneda: 'PEN', fecVenc: ayer },
                { asegurado: 'A', importe: -50, moneda: 'PEN', fecVenc: ayer },
                { asegurado: 'A', importe: 25, moneda: 'PEN', fecVenc: ayer },
            ],
            {},
            hoy,
        );
        expect(res['A'].vencidoPEN).toBe(25);
    });
});

/**
 * BDCache key normalization (cache_helper.js).
 * Two queries para el mismo asegurado deben aterrizar en la misma key.
 */
function bdCacheKey(asegurado: string): string {
    const norm = String(asegurado || '').trim().toUpperCase();
    return 'BD_FILTER::' + norm.substring(0, 200);
}

describe('BDCache: key normalization', () => {
    it('mismo asegurado en distinto casing produce la misma key', () => {
        expect(bdCacheKey('acme s.a.c.')).toBe(bdCacheKey('ACME S.A.C.'));
        expect(bdCacheKey(' Acme  ')).toBe(bdCacheKey('ACME'));
    });

    it('nombres largos se truncan a 200 caracteres', () => {
        const largo = 'A'.repeat(500);
        const key = bdCacheKey(largo);
        expect(key.length).toBeLessThanOrEqual('BD_FILTER::'.length + 200);
    });

    it('null/undefined no crashea', () => {
        expect(() => bdCacheKey(null as unknown as string)).not.toThrow();
        expect(() => bdCacheKey(undefined as unknown as string)).not.toThrow();
    });
});

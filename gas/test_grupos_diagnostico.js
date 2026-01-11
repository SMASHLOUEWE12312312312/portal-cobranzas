/**
 * Script de diagnóstico para Grupos Económicos
 * Ejecutar desde el editor de Apps Script
 */

function diagnosticarGrupos() {
    Logger.log('========== DIAGNÓSTICO DE GRUPOS ECONÓMICOS ==========');

    try {
        // 1. Verificar que la hoja existe
        Logger.log('\n1. Verificando hoja Grupos_Economicos...');
        const ss = SpreadsheetApp.getActive();
        const sheetName = getConfig('SHEETS.GRUPOS_ECONOMICOS', 'Grupos_Economicos');
        const sheet = ss.getSheetByName(sheetName);

        if (!sheet) {
            Logger.log('❌ ERROR: La hoja no existe');
            return;
        }
        Logger.log('✅ Hoja encontrada: ' + sheetName);

        // 2. Verificar datos en la hoja
        Logger.log('\n2. Leyendo datos de la hoja...');
        const lastRow = sheet.getLastRow();
        Logger.log('Última fila con datos: ' + lastRow);

        if (lastRow <= 1) {
            Logger.log('❌ ERROR: La hoja está vacía (solo tiene encabezados)');
            return;
        }

        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        Logger.log('Encabezados: ' + JSON.stringify(headers));

        const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
        Logger.log('Total de filas de datos: ' + data.length);
        Logger.log('Primeras 3 filas: ' + JSON.stringify(data.slice(0, 3)));

        // 3. Probar SheetsIO.readSheet
        Logger.log('\n3. Probando SheetsIO.readSheet...');
        const sheetData = SheetsIO.readSheet(sheetName);
        Logger.log('Filas leídas por SheetsIO: ' + sheetData.rows.length);
        Logger.log('ColumnMap: ' + JSON.stringify(sheetData.columnMap));

        // 4. Probar GrupoEconomicoService
        Logger.log('\n4. Probando GrupoEconomicoService...');

        // Invalidar caché primero
        GrupoEconomicoService.invalidateCache();

        const grupos = GrupoEconomicoService.getGrupos();
        Logger.log('Grupos obtenidos: ' + JSON.stringify(grupos));
        Logger.log('Total de grupos: ' + grupos.length);

        if (grupos.length > 0) {
            const primerGrupo = grupos[0];
            const asegurados = GrupoEconomicoService.getAsegurados(primerGrupo);
            Logger.log('Asegurados del grupo "' + primerGrupo + '": ' + JSON.stringify(asegurados));
        }

        // 5. Probar API
        Logger.log('\n5. Probando getGrupos_API...');

        // Crear un token de prueba (usar uno válido de tu sesión)
        const testToken = 'TEST_TOKEN'; // Reemplazar con token real si es necesario

        try {
            const apiResult = getGrupos_API(testToken);
            Logger.log('Resultado de API: ' + JSON.stringify(apiResult));
        } catch (e) {
            Logger.log('Error en API (esperado si no hay token válido): ' + e.message);

            // Probar sin autenticación
            Logger.log('Probando directamente sin token...');
            const directResult = { ok: true, data: GrupoEconomicoService.getGrupos() };
            Logger.log('Resultado directo: ' + JSON.stringify(directResult));
        }

        Logger.log('\n========== FIN DEL DIAGNÓSTICO ==========');

    } catch (error) {
        Logger.log('❌ ERROR FATAL: ' + error.message);
        Logger.log('Stack: ' + error.stack);
    }
}

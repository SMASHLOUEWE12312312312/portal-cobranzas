/**
 * Script de diagnóstico para generación de grupos
 * Ejecutar desde el editor de Apps Script
 */

function diagnosticarGeneracionGrupo() {
    Logger.log('========== DIAGNÓSTICO DE GENERACIÓN GRUPO ==========');

    const grupoNombre = 'GRUPO CARLEY'; // Cambiar si es necesario

    try {
        // 1. Verificar asegurados del grupo
        Logger.log('\n1. Verificando asegurados del grupo...');
        const asegurados = GrupoEconomicoService.getAsegurados(grupoNombre);
        Logger.log(`Total asegurados en ${grupoNombre}: ${asegurados.length}`);
        Logger.log('Asegurados: ' + JSON.stringify(asegurados));

        // 2. Verificar lectura de BD
        Logger.log('\n2. Probando lectura de BD...');
        const startRead = Date.now();
        const baseData = SheetsIO.readSheet(getConfig('SHEETS.BASE'));
        const readTime = Date.now() - startRead;
        Logger.log(`Tiempo de lectura BD: ${readTime}ms`);
        Logger.log(`Total filas en BD: ${baseData.rows.length}`);

        // 3. Probar filtrado para primer asegurado
        Logger.log('\n3. Probando filtrado para primer asegurado...');
        const aseguradoCol = Utils.findColumnIndex(baseData.headers, getConfig('BD.COLUMNS.ASEGURADO'));
        const primerAsegurado = asegurados[0];

        const startFilter = Date.now();
        const rowsAsegurado = baseData.rows.filter(row =>
            Utils.cleanText(row[aseguradoCol]) === Utils.cleanText(primerAsegurado)
        );
        const filterTime = Date.now() - startFilter;

        Logger.log(`Asegurado: ${primerAsegurado}`);
        Logger.log(`Filas encontradas: ${rowsAsegurado.length}`);
        Logger.log(`Tiempo de filtrado: ${filterTime}ms`);

        // 4. Probar generación de UN solo asegurado
        Logger.log('\n4. Probando generación de UN asegurado...');
        const startGen = Date.now();

        const result = EECCCore._generateFromFilteredData(primerAsegurado, rowsAsegurado, baseData.headers, {
            exportPdf: true,
            exportXlsx: false,
            includeObs: false
        });

        const genTime = Date.now() - startGen;

        Logger.log(`Resultado: ${result.ok ? 'ÉXITO' : 'ERROR'}`);
        if (result.ok) {
            Logger.log(`PDF URL: ${result.pdfUrl}`);
        } else {
            Logger.log(`Error: ${result.error}`);
        }
        Logger.log(`Tiempo de generación: ${genTime}ms (${(genTime / 1000).toFixed(2)}s)`);

        // 5. Estimación para grupo completo
        Logger.log('\n5. Estimación para grupo completo...');
        const estimatedTotal = (readTime + (genTime * asegurados.length)) / 1000;
        Logger.log(`Tiempo estimado total: ${estimatedTotal.toFixed(2)}s`);
        Logger.log(`Batches necesarios (6 por batch): ${Math.ceil(asegurados.length / 6)}`);

        Logger.log('\n========== FIN DEL DIAGNÓSTICO ==========');

    } catch (error) {
        Logger.log('❌ ERROR FATAL: ' + error.message);
        Logger.log('Stack: ' + error.stack);
    }
}

/**
 * Probar generación completa del grupo (con timeout monitoring)
 */
function probarGeneracionGrupoCompleta() {
    Logger.log('========== PRUEBA DE GENERACIÓN COMPLETA ==========');

    const grupoNombre = 'GRUPO CARLEY';
    const startTime = Date.now();

    try {
        const result = EECCCore.generateByGrupo(grupoNombre, {
            exportPdf: true,
            exportXlsx: false,
            includeObs: false
        });

        const totalTime = Date.now() - startTime;

        Logger.log('\n========== RESULTADO ==========');
        Logger.log('Tiempo total: ' + (totalTime / 1000).toFixed(2) + 's');
        Logger.log('OK: ' + result.ok);
        Logger.log('Generados: ' + result.generatedCount + '/' + result.totalAsegurados);
        Logger.log('Errores: ' + result.errorCount);
        Logger.log('Batches procesados: ' + result.batchesProcessed);

        if (result.errors && result.errors.length > 0) {
            Logger.log('\nErrores:');
            result.errors.forEach(e => {
                Logger.log(`  - ${e.asegurado}: ${e.error}`);
            });
        }

    } catch (error) {
        const totalTime = Date.now() - startTime;
        Logger.log('❌ ERROR después de ' + (totalTime / 1000).toFixed(2) + 's');
        Logger.log('Error: ' + error.message);
        Logger.log('Stack: ' + error.stack);
    }
}

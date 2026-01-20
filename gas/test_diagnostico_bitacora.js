/**
 * Test para verificar que hasNext se devuelve correctamente
 */
function testHasNextPagination() {
    console.log('========== TEST hasNext ==========');

    // Simular página 1 con pageSize 50
    const page1 = BitacoraService.obtenerResumenCiclos({}, { page: 1, pageSize: 50 });

    console.log('Página 1:');
    console.log('  - Datos recibidos: ' + page1.data.length);
    console.log('  - Total registros: ' + page1.pagination.total);
    console.log('  - Total páginas: ' + page1.pagination.totalPages);
    console.log('  - hasNext: ' + page1.pagination.hasNext);
    console.log('  - hasPrev: ' + page1.pagination.hasPrev);

    if (page1.pagination.hasNext) {
        console.log('\n✅ hasNext = true (CORRECTO para 60 registros con pageSize 50)');

        // Probar página 2
        const page2 = BitacoraService.obtenerResumenCiclos({}, { page: 2, pageSize: 50 });
        console.log('\nPágina 2:');
        console.log('  - Datos recibidos: ' + page2.data.length);
        console.log('  - hasNext: ' + page2.pagination.hasNext);

        // Verificar si PUCK está en página 2
        const puckEnPag2 = page2.data.find(r => r.asegurado.includes('PUCK'));
        if (puckEnPag2) {
            console.log('\n✅ PUCK S.A.C. está en página 2:');
            console.log('  - Estado: ' + puckEnPag2.estadoGestion);
            console.log('  - Días: ' + puckEnPag2.diasDesdeRegistro);
        } else {
            console.log('\n❌ PUCK S.A.C. NO está en página 2');
        }
    } else {
        console.log('\n❌ hasNext = false (INCORRECTO - debería ser true)');
    }

    // Probar API completa (como la llama el frontend)
    console.log('\n--- Probando API bitacoraGetResumenCiclos ---');
    const apiResult = bitacoraGetResumenCiclos('__TEST__', { page: 1, pageSize: 50 });
    console.log('API Result:');
    console.log('  - ok: ' + apiResult.ok);
    console.log('  - data.length: ' + (apiResult.data ? apiResult.data.length : 0));
    console.log('  - pagination: ' + JSON.stringify(apiResult.pagination));

    console.log('\n========== FIN TEST ==========');
}

/**
 * TEST: Verificar que el deployment esté usando la versión más reciente del código
 */

function testDeploymentVersion() {
  return {
    ok: true,
    version: 'v3.0-2025-01-15-ULTRA-FIXED',
    timestamp: new Date().toISOString(),
    mensaje: 'Si ves esta versión, el deployment está actualizado',
    codigoSubido: true
  };
}

/**
 * TEST 2: Verificar configuración
 */
function testConfiguracion() {
  try {
    var ssId = getConfig('SPREADSHEET_ID', '');
    
    return {
      ok: true,
      spreadsheetIdConfigurado: ssId ? true : false,
      spreadsheetIdPrimeros10: ssId ? ssId.substring(0, 10) : 'VACIO',
      mensaje: ssId ? 'SPREADSHEET_ID configurado' : 'SPREADSHEET_ID NO configurado - Necesitas configurarlo'
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}


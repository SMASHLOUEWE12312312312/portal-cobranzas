/**
 * Script helper para obtener el Spreadsheet ID
 * 
 * CÓMO USAR:
 * 1. Ve a Apps Script Editor
 * 2. Abre este archivo
 * 3. Ejecuta la función: mostrarSpreadsheetID()
 * 4. Copia el ID que aparece en el popup
 * 5. Pégalo en config.js línea 12
 */

function mostrarSpreadsheetID() {
  try {
    const ss = SpreadsheetApp.getActive();
    const id = ss.getId();
    const url = ss.getUrl();
    
    const mensaje = 
      '✅ ID DEL SPREADSHEET\n\n' +
      `${id}\n\n` +
      '📋 CÓPIALO Y PÉGALO EN:\n' +
      'gas/config.js línea 12:\n\n' +
      `SPREADSHEET_ID: '${id}',\n\n` +
      'Luego ejecuta: clasp push --force';
    
    SpreadsheetApp.getUi().alert('📋 Copiar ID', mensaje, SpreadsheetApp.getUi().ButtonSet.OK);
    
    Logger.log('========================================');
    Logger.log('SPREADSHEET ID:');
    Logger.log(id);
    Logger.log('========================================');
    Logger.log('URL:');
    Logger.log(url);
    Logger.log('========================================');
    Logger.log('Agrega esto a config.js línea 12:');
    Logger.log(`SPREADSHEET_ID: '${id}',`);
    Logger.log('========================================');
    
    return { ok: true, id: id, url: url };
  } catch (error) {
    const mensaje = '❌ Error: ' + error.message;
    SpreadsheetApp.getUi().alert('Error', mensaje, SpreadsheetApp.getUi().ButtonSet.OK);
    Logger.error('mostrarSpreadsheetID', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Verifica si el ID está configurado correctamente
 */
function verificarConfiguracionID() {
  try {
    const configId = getConfig('SPREADSHEET_ID', '');
    const actualId = SpreadsheetApp.getActive().getId();
    
    if (!configId) {
      const mensaje = 
        '⚠️ SPREADSHEET_ID NO CONFIGURADO\n\n' +
        `ID actual: ${actualId}\n\n` +
        'Ejecuta: mostrarSpreadsheetID()\n' +
        'Para obtener instrucciones.';
      
      SpreadsheetApp.getUi().alert('Configuración Pendiente', mensaje, SpreadsheetApp.getUi().ButtonSet.OK);
      Logger.warn('verificarConfiguracionID', 'SPREADSHEET_ID not configured');
      return { ok: false, configured: false, actualId: actualId };
    }
    
    if (configId !== actualId) {
      const mensaje = 
        '⚠️ SPREADSHEET_ID INCORRECTO\n\n' +
        `Configurado: ${configId}\n` +
        `Actual: ${actualId}\n\n` +
        'El ID en config.js no coincide con este spreadsheet.';
      
      SpreadsheetApp.getUi().alert('ID Incorrecto', mensaje, SpreadsheetApp.getUi().ButtonSet.OK);
      Logger.warn('verificarConfiguracionID', 'ID mismatch', { configured: configId, actual: actualId });
      return { ok: false, configured: true, mismatch: true, configId: configId, actualId: actualId };
    }
    
    const mensaje = 
      '✅ CONFIGURACIÓN CORRECTA\n\n' +
      `ID: ${configId}\n\n` +
      'El SPREADSHEET_ID está configurado correctamente.\n' +
      'Ahora crea un NUEVO deployment de Web App.';
    
    SpreadsheetApp.getUi().alert('Todo OK', mensaje, SpreadsheetApp.getUi().ButtonSet.OK);
    Logger.info('verificarConfiguracionID', 'Configuration OK', { id: configId });
    return { ok: true, configured: true, id: configId };
    
  } catch (error) {
    Logger.error('verificarConfiguracionID', error);
    return { ok: false, error: error.message };
  }
}


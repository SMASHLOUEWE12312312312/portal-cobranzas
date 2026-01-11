/**
 * TEST: Lee Mail_Contacts y muestra datos
 * Ejecuta esto manualmente desde Apps Script Editor
 */
function testReadMailContacts() {
    const sheetName = 'Mail_Contacts';
    const data = SheetsIO.readSheet(sheetName);

    Logger.log('=== DIAGNÓSTICO MAIL_CONTACTS ===');
    Logger.log('Total filas: ' + data.rows.length);
    Logger.log('ColumnMap: ' + JSON.stringify(data.columnMap, null, 2));

    if (data.rows.length > 0) {
        Logger.log('\n=== PRIMERA FILA (índice 0) ===');
        Logger.log('Fila completa: ' + JSON.stringify(data.rows[0]));
        Logger.log('ASEGURADO_ID (índice ' + data.columnMap.ASEGURADO_ID + '): ' + data.rows[0][data.columnMap.ASEGURADO_ID]);
        Logger.log('ASEGURADO_NOMBRE (índice ' + data.columnMap.ASEGURADO_NOMBRE + '): ' + data.rows[0][data.columnMap.ASEGURADO_NOMBRE]);
    }

    // Probar readContacts
    Logger.log('\n=== PROBANDO SheetsMail.readContacts() ===');
    const contacts = SheetsMail.readContacts();
    Logger.log('Contactos cargados: ' + contacts.length);

    if (contacts.length > 0) {
        Logger.log('Primer contacto: ' + JSON.stringify(contacts[0], null, 2));
    }
}

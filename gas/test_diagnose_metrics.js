function diagnoseDashboardMetrics() {
    const sheets = ['Bitacora_Gestiones_EECC', 'Mail_Queue'];
    const ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));

    sheets.forEach(sheetName => {
        console.log(`\n\n=== DIAGNOSIS FOR: ${sheetName} ===`);
        const sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
            console.log('❌ Sheet not found');
            return;
        }

        // Read Headers
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        console.log('HEADERS:', JSON.stringify(headers));

        // Read First 5 Rows
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
            const data = sheet.getRange(2, 1, Math.min(5, lastRow - 1), sheet.getLastColumn()).getValues();
            console.log('SAMPLE DATA (First 5 rows):');
            data.forEach((row, i) => {
                // Map row to header for easier reading
                const mapped = {};
                headers.forEach((h, idx) => mapped[h] = row[idx]);
                console.log(`ROW ${i + 1}:`, JSON.stringify(mapped));
            });
        } else {
            console.log('No data rows found');
        }
    });

    // Test MonitoringService Logic locally
    console.log('\n\n=== TESTING MonitoringService._buildDashboardStats() ===');
    if (typeof MonitoringService !== 'undefined') {
        try {
            // Force bypass cache if possible, or just call internal method if accessible
            // Since _buildDashboardStats is private/internal in object, we might not reach it directly easily via simple script if not exported.
            // But we can call getDashboardStats()
            CacheService.getScriptCache().remove(MonitoringService.CACHE_KEY_STATS);
            const stats = MonitoringService.getDashboardStats();
            console.log('GENERATED STATS:', JSON.stringify(stats, null, 2));
        } catch (e) {
            console.error('Error running service:', e);
        }
    }
}

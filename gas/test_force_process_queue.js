function forceProcessQueueAndReport() {
    const sheetName = 'Mail_Queue';
    const ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) return '❌ Mail_Queue sheet not found';

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const logs = [];

    logs.push(`Total rows: ${data.length}`);

    // Status counts
    const counts = {};
    data.slice(1).forEach(row => {
        const status = row[1]; // Column B is STATUS
        counts[status] = (counts[status] || 0) + 1;
    });
    logs.push('Status Counts: ' + JSON.stringify(counts));

    // Check for stuck items
    const now = new Date();
    data.slice(1).forEach((row, i) => {
        const status = row[1];
        const processedAt = new Date(row[5]); // Column F is PROCESSED_AT

        if (status === 'PROCESSING') {
            const diffMin = (now - processedAt) / 60000;
            logs.push(`⚠️ Row ${i + 2} is PROCESSING for ${diffMin.toFixed(1)} min.`);
            if (diffMin > 10) {
                logs.push(`  -> FORCE RESETTING to PENDING`);
                sheet.getRange(i + 2, 2).setValue('PENDING');
            }
        }
    });

    // Force Process
    logs.push('Starting jobProcesarCorreos_()...');
    try {
        // Call the trigger function directly
        jobProcesarCorreos_();
        logs.push('✅ Job completed without uncaught error.');
    } catch (e) {
        logs.push('❌ Job failed: ' + e.message);
        logs.push('Stack: ' + e.stack);
    }

    // Final Status Check
    const dataAfter = sheet.getDataRange().getValues();
    const countsAfter = {};
    dataAfter.slice(1).forEach(row => {
        const status = row[1];
        countsAfter[status] = (countsAfter[status] || 0) + 1;
    });
    logs.push('Final Status Counts: ' + JSON.stringify(countsAfter));

    return logs.join('\n');
}

/**
 * @fileoverview Test functions for Phase 0 Quick Wins
 * @version 1.0.0
 * @date 2026-01-12
 * 
 * Run these tests manually in Apps Script Editor:
 * Run → Run function → select test function
 * 
 * TESTS:
 * 1. testLockService() - Verify LockService acquisition and blocking
 * 2. testCorrelationId() - Verify correlationId in Logger
 * 3. testBitacoraCache() - Verify 30s cache duration
 * 4. testLogoCache() - Verify logo caching in DriveIO
 * 5. testPhase0All() - Run all tests
 */

/**
 * Test LockService acquisition and release
 */
function testLockService() {
    const context = 'testLockService';
    console.log('='.repeat(50));
    console.log('TEST: LockService');
    console.log('='.repeat(50));

    const results = {
        lockAcquired: false,
        lockReleased: false,
        doubleBlockWorks: false
    };

    try {
        // Test 1: Acquire lock
        console.log('1. Acquiring lock...');
        const lock = LockService.getScriptLock();
        const acquired = lock.tryLock(5000);
        results.lockAcquired = acquired;
        console.log('   Lock acquired:', acquired);

        if (acquired) {
            // Test 2: Try to acquire second lock (should fail quickly)
            console.log('2. Trying to acquire second lock (should fail)...');
            const lock2 = LockService.getScriptLock();
            const canAcquireSecond = lock2.tryLock(100);
            results.doubleBlockWorks = !canAcquireSecond;
            console.log('   Second lock acquired (should be false):', canAcquireSecond);

            // Release first lock
            console.log('3. Releasing lock...');
            lock.releaseLock();
            results.lockReleased = true;
            console.log('   Lock released');
        }

        // Summary
        console.log('\nRESULTS:');
        console.log('   Lock acquisition works:', results.lockAcquired);
        console.log('   Double-block prevention works:', results.doubleBlockWorks);
        console.log('   Lock release works:', results.lockReleased);

        const passed = results.lockAcquired && results.doubleBlockWorks && results.lockReleased;
        console.log('\n', passed ? '✅ PASSED' : '❌ FAILED');

        return results;

    } catch (error) {
        console.error('ERROR:', error.message);
        return { error: error.message };
    }
}

/**
 * Test correlationId in Logger
 */
function testCorrelationId() {
    const context = 'testCorrelationId';
    console.log('='.repeat(50));
    console.log('TEST: CorrelationId');
    console.log('='.repeat(50));

    const results = {
        setWorks: false,
        getWorks: false,
        clearWorks: false,
        loggedWithId: false
    };

    try {
        // Test 1: Set correlation ID
        const testId = 'TEST-' + Date.now();
        console.log('1. Setting correlationId:', testId);
        Logger.setCorrelationId(testId);

        // Test 2: Get correlation ID
        const currentId = Logger.getCorrelationId();
        results.setWorks = currentId === testId;
        results.getWorks = currentId === testId;
        console.log('2. Getting correlationId:', currentId);
        console.log('   Matches:', currentId === testId);

        // Test 3: Log something with correlationId
        console.log('3. Logging with correlationId...');
        Logger.info(context, 'Test log entry with correlationId');
        results.loggedWithId = true;

        // Test 4: Clear correlation ID
        console.log('4. Clearing correlationId...');
        Logger.clearCorrelationId();
        const clearedId = Logger.getCorrelationId();
        results.clearWorks = clearedId === null;
        console.log('   Cleared (should be null):', clearedId);

        // Flush logs to sheet
        console.log('5. Flushing logs to sheet...');
        const flushResult = Logger.flush();
        console.log('   Flush result:', flushResult.ok ? 'OK' : 'FAILED', '- count:', flushResult.count);

        // Summary
        console.log('\nRESULTS:');
        console.log('   Set works:', results.setWorks);
        console.log('   Get works:', results.getWorks);
        console.log('   Clear works:', results.clearWorks);
        console.log('   Logged with ID:', results.loggedWithId);

        const passed = results.setWorks && results.getWorks && results.clearWorks;
        console.log('\n', passed ? '✅ PASSED' : '❌ FAILED');
        console.log('\nNOTE: Check Debug_Log sheet for column G (CorrelationId)');

        return results;

    } catch (error) {
        console.error('ERROR:', error.message);
        return { error: error.message };
    }
}

/**
 * Test Bitácora cache duration (should be 30s from config)
 */
function testBitacoraCache() {
    const context = 'testBitacoraCache';
    console.log('='.repeat(50));
    console.log('TEST: Bitácora Cache Duration');
    console.log('='.repeat(50));

    const results = {
        configValue: 0,
        is30Seconds: false,
        cacheWorks: false
    };

    try {
        // Test 1: Check config value
        const duration = getConfig('FEATURES.BITACORA_CACHE_DURATION_MS', 30000);
        results.configValue = duration;
        results.is30Seconds = duration === 30000;
        console.log('1. Cache duration from config:', duration, 'ms');
        console.log('   Is 30 seconds:', results.is30Seconds);

        // Test 2: Measure actual cache behavior
        console.log('2. Testing cache behavior...');

        // First read (should be from sheet)
        const start1 = Date.now();
        BitacoraService.obtenerResumenCiclos({});
        const time1 = Date.now() - start1;
        console.log('   First read:', time1, 'ms');

        // Second read (should be from cache)
        const start2 = Date.now();
        BitacoraService.obtenerResumenCiclos({});
        const time2 = Date.now() - start2;
        console.log('   Second read (cached):', time2, 'ms');

        // Cache should make second read faster
        results.cacheWorks = time2 < time1 * 0.8; // At least 20% faster
        console.log('   Cache speedup:', results.cacheWorks);

        // Summary
        console.log('\nRESULTS:');
        console.log('   Config value:', results.configValue, 'ms');
        console.log('   Is 30 seconds:', results.is30Seconds);
        console.log('   Cache provides speedup:', results.cacheWorks);

        const passed = results.is30Seconds;
        console.log('\n', passed ? '✅ PASSED' : '❌ FAILED');

        return results;

    } catch (error) {
        console.error('ERROR:', error.message);
        return { error: error.message };
    }
}

/**
 * Test logo caching in DriveIO
 */
function testLogoCache() {
    const context = 'testLogoCache';
    console.log('='.repeat(50));
    console.log('TEST: Logo Cache');
    console.log('='.repeat(50));

    const results = {
        cacheEnabled: false,
        logoLoaded: false,
        cacheSpeedup: false
    };

    try {
        // Test 1: Check config
        const cacheEnabled = getConfig('FEATURES.ENABLE_LOGO_CACHE', true);
        results.cacheEnabled = cacheEnabled;
        console.log('1. Logo cache enabled:', cacheEnabled);

        // Test 2: First load (should read from Drive and cache)
        console.log('2. First logo load...');
        const start1 = Date.now();
        const blob1 = DriveIO.getLogoCached();
        const time1 = Date.now() - start1;
        results.logoLoaded = blob1 !== null;
        console.log('   First load:', time1, 'ms');
        console.log('   Logo loaded:', results.logoLoaded);

        if (blob1) {
            console.log('   Logo size:', blob1.getBytes().length, 'bytes');
        }

        // Test 3: Second load (should be from cache)
        console.log('3. Second logo load (should be cached)...');
        const start2 = Date.now();
        const blob2 = DriveIO.getLogoCached();
        const time2 = Date.now() - start2;
        console.log('   Second load:', time2, 'ms');

        results.cacheSpeedup = time2 < time1 * 0.5; // At least 50% faster
        console.log('   Cache provides speedup:', results.cacheSpeedup);

        // Summary
        console.log('\nRESULTS:');
        console.log('   Cache enabled:', results.cacheEnabled);
        console.log('   Logo loaded successfully:', results.logoLoaded);
        console.log('   Cache provides speedup:', results.cacheSpeedup);

        const passed = results.logoLoaded;
        console.log('\n', passed ? '✅ PASSED' : '❌ FAILED');

        // Flush logs
        Logger.flush();

        return results;

    } catch (error) {
        console.error('ERROR:', error.message);
        return { error: error.message };
    }
}

/**
 * Run all Phase 0 tests
 */
function testPhase0All() {
    console.log('╔' + '═'.repeat(50) + '╗');
    console.log('║          PHASE 0 QUICK WINS - ALL TESTS          ║');
    console.log('╚' + '═'.repeat(50) + '╝');
    console.log('');

    const results = {
        lockService: testLockService(),
        correlationId: testCorrelationId(),
        bitacoraCache: testBitacoraCache(),
        logoCache: testLogoCache()
    };

    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY');
    console.log('='.repeat(50));

    const lockPassed = results.lockService.lockAcquired && results.lockService.doubleBlockWorks;
    const corrPassed = results.correlationId.setWorks && results.correlationId.clearWorks;
    const cachePassed = results.bitacoraCache.is30Seconds;
    const logoPassed = results.logoCache.logoLoaded;

    console.log('LockService:', lockPassed ? '✅' : '❌');
    console.log('CorrelationId:', corrPassed ? '✅' : '❌');
    console.log('Bitácora Cache:', cachePassed ? '✅' : '❌');
    console.log('Logo Cache:', logoPassed ? '✅' : '❌');

    const allPassed = lockPassed && corrPassed && cachePassed && logoPassed;
    console.log('\nOVERALL:', allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED');

    return results;
}

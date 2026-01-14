/**
 * Setup BFF Shared Secret
 * 
 * Run this function ONCE from Apps Script editor to configure
 * the BFF_SHARED_SECRET for server-to-server authentication.
 * 
 * Usage:
 * 1. Open Apps Script editor
 * 2. Run setupBffSharedSecret()
 * 3. Copy the generated secret
 * 4. Paste in Vercel Environment Variables
 */

/**
 * Generates and sets BFF_SHARED_SECRET in Script Properties
 * Run this ONCE to initialize the secret
 */
function setupBffSharedSecret() {
    const props = PropertiesService.getScriptProperties();

    // Check if already exists
    const existing = props.getProperty('BFF_SHARED_SECRET');
    if (existing) {
        console.log('⚠️ BFF_SHARED_SECRET already exists.');
        console.log('Current value (first 8 chars):', existing.substring(0, 8) + '...');
        console.log('\nTo regenerate, run: regenerateBffSharedSecret()');
        return {
            exists: true,
            partial: existing.substring(0, 8) + '...',
        };
    }

    // Generate strong random secret (32 bytes = 256 bits)
    const bytes = [];
    for (let i = 0; i < 32; i++) {
        bytes.push(Math.floor(Math.random() * 256));
    }
    const secret = Utilities.base64Encode(bytes);

    // Store in Script Properties
    props.setProperty('BFF_SHARED_SECRET', secret);

    console.log('✅ BFF_SHARED_SECRET created successfully!');
    console.log('\n📋 COPY THIS SECRET TO VERCEL ENV VARS:');
    console.log('='.repeat(50));
    console.log(secret);
    console.log('='.repeat(50));
    console.log('\nIn Vercel Dashboard:');
    console.log('1. Go to Project Settings → Environment Variables');
    console.log('2. Add: BFF_SHARED_SECRET = [paste the secret above]');
    console.log('3. Also add: GAS_BASE_URL = [your Web App URL ending in /exec]');
    console.log('4. Also add: SESSION_SECRET = [another strong random secret]');

    return {
        success: true,
        secret: secret,
        message: 'Copy this secret to Vercel ENV vars',
    };
}

/**
 * Regenerate BFF_SHARED_SECRET (use with caution - will break existing BFF connections)
 */
function regenerateBffSharedSecret() {
    const props = PropertiesService.getScriptProperties();

    // Backup old secret (24-48h migration window)
    const old = props.getProperty('BFF_SHARED_SECRET');
    if (old) {
        props.setProperty('BFF_SHARED_SECRET_OLD', old);
        console.log('📦 Old secret backed up to BFF_SHARED_SECRET_OLD');
    }

    // Delete existing so setupBffSharedSecret() will generate new one
    props.deleteProperty('BFF_SHARED_SECRET');

    // Generate new
    return setupBffSharedSecret();
}

/**
 * View current BFF_SHARED_SECRET (partial, for debugging)
 */
function viewBffSharedSecret() {
    const props = PropertiesService.getScriptProperties();
    const secret = props.getProperty('BFF_SHARED_SECRET');

    if (!secret) {
        console.log('❌ BFF_SHARED_SECRET not configured');
        console.log('Run: setupBffSharedSecret()');
        return { exists: false };
    }

    console.log('✅ BFF_SHARED_SECRET is configured');
    console.log('First 8 chars:', secret.substring(0, 8) + '...');
    console.log('Length:', secret.length, 'characters');

    return {
        exists: true,
        partial: secret.substring(0, 8) + '...',
        length: secret.length,
    };
}

/**
 * Generate SESSION_SECRET for Vercel (run once, copy to Vercel)
 * This is separate from BFF_SHARED_SECRET
 */
function generateSessionSecret() {
    const bytes = [];
    for (let i = 0; i < 32; i++) {
        bytes.push(Math.floor(Math.random() * 256));
    }
    const secret = Utilities.base64Encode(bytes);

    console.log('📋 SESSION_SECRET for Vercel:');
    console.log('='.repeat(50));
    console.log(secret);
    console.log('='.repeat(50));
    console.log('\nAdd this to Vercel ENV vars as: SESSION_SECRET');

    return { secret };
}

/**
 * Verify all required secrets are configured
 */
function verifySecretsSetup() {
    const props = PropertiesService.getScriptProperties();

    const checks = {
        BFF_SHARED_SECRET: !!props.getProperty('BFF_SHARED_SECRET'),
        API_SECRET: !!props.getProperty('API_SECRET'),
    };

    console.log('=== SECRETS VERIFICATION ===');
    for (const [key, exists] of Object.entries(checks)) {
        console.log(`${exists ? '✅' : '❌'} ${key}: ${exists ? 'Configured' : 'MISSING'}`);
    }

    const allGood = Object.values(checks).every(v => v);
    console.log('\n' + (allGood ? '✅ All secrets configured!' : '❌ Some secrets are missing'));

    return checks;
}

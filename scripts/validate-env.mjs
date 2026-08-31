# Environment Variable Validation Script
# Run this before deployment to ensure all required secrets are set

import { readFileSync, existsSync } from 'fs'

const REQUIRED_VARS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'NEXTAUTH_SECRET',
  'JWT_SECRET',
  'NEXTAUTH_URL',
  'NEXT_PUBLIC_APP_URL',
  'ARTIFACT_SIGNING_SECRET',
]

const RECOMMENDED_VARS = [
  'REDIS_URL',
  'CRON_SECRET',
  'N8N_ENCRYPTION_KEY',
]

const OPTIONAL_VARS = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'META_CLIENT_ID',
  'META_CLIENT_SECRET',
  'SPOTIFY_CLIENT_ID',
  'SPOTIFY_CLIENT_SECRET',
  'RAKAZO_SANDBOX_SUPERVISOR_TOKEN',
]

function validateEnv() {
  console.log('🔍 Validating environment variables...\n')

  const envPath = '.env'
  if (!existsSync(envPath)) {
    console.error('❌ No .env file found')
    process.exit(1)
  }

  const envContent = readFileSync(envPath, 'utf-8')
  const missing: string[] = []
  const warnings: string[] = []

  for (const varName of REQUIRED_VARS) {
    const regex = new RegExp(`^${varName}=(.+)$`, 'm')
    const match = envContent.match(regex)
    if (!match || match[1].trim() === '' || match[1].includes('change-me')) {
      missing.push(varName)
    }
  }

  for (const varName of RECOMMENDED_VARS) {
    const regex = new RegExp(`^${varName}=(.+)$`, 'm')
    const match = envContent.match(regex)
    if (!match || match[1].trim() === '') {
      warnings.push(varName)
    }
  }

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach(v => console.error(`   - ${v}`))
    console.error('\n💡 Generate secure secrets with:')
    console.error('   openssl rand -hex 32')
    process.exit(1)
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Recommended variables not set:')
    warnings.forEach(v => console.warn(`   - ${v}`))
    console.warn('')
  }

  // Check for weak secrets
  const weakSecrets = ['default', 'change-me', 'secret', 'password', '12345']
  const envLines = envContent.split('\n')
  let hasWeakSecret = false

  for (const line of envLines) {
    const [key, value] = line.split('=')
    if (key && value && (key.includes('SECRET') || key.includes('KEY') || key.includes('PASSWORD'))) {
      for (const weak of weakSecrets) {
        if (value.toLowerCase().includes(weak)) {
          console.warn(`⚠️  Weak secret detected: ${key} contains "${weak}"`)
          hasWeakSecret = true
        }
      }
    }
  }

  if (hasWeakSecret) {
    console.warn('\n💡 Use strong secrets:')
    console.warn('   openssl rand -hex 32\n')
  }

  console.log('✅ All required environment variables are set')
  console.log('✅ Environment validation passed\n')
}

validateEnv()

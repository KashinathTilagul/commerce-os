import { defineConfig } from '@prisma/config'
import 'dotenv/config'

export default defineConfig({
  datasource: {
    // Prefer a session/direct connection for Prisma CLI operations. The app
    // continues to use DATABASE_URL (typically Supabase transaction pooling).
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || 'postgresql://ekvaar:ekvaar_dev_2026@localhost:5432/ekvaar',
  }
})

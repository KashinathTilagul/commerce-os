import { defineConfig } from '@prisma/config'

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://ekvaar:ekvaar_dev_2026@localhost:5432/ekvaar',
  }
})

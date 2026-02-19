import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema/**/*.ts',
  out: './db',
  dbCredentials: {
    url: process.env.DB_URL!,
  },
})
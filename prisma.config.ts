import path from 'path'
import "dotenv/config"
import { defineConfig, env } from 'prisma/config'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error("DATABASE_URL is not defined in .env")


export default defineConfig({
  schema: path.join('src', 'api', 'prisma', 'schema.prisma'),
  migrations: {
    path: path.join('src', 'api', 'prisma', 'migrations'),
  },
  datasource: {
    url: databaseUrl,
  },
})
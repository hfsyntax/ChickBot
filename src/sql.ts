import postgres from "postgres"

const connectionString = process.env.DATABASE_URL

if (!connectionString)
  throw new Error("DATABASE_URL environment variable is not defined.")

const sql = postgres(connectionString)

export default sql

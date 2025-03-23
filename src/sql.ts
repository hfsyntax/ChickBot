import postgres from "postgres"
const sql = postgres({
  host: process.env.DB_SERVERNAME,
  database: process.env.DB_DBNAME,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  ssl: "require",
})

export default sql

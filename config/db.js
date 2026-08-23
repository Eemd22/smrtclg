const mysql = require("mysql2");

const sslRequired = String(process.env.MYSQL_SSL || "").toLowerCase() === "true";
const caPath = process.env.MYSQL_SSL_CA;

const sslOptions = sslRequired
  ? {
      minVersion: "TLSv1.2",
      ...(caPath ? { ca: require("fs").readFileSync(caPath, "utf8") } : {}),
      rejectUnauthorized: Boolean(caPath) || process.env.MYSQL_SSL_STRICT === "true"
    }
  : undefined;

const db = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "smart_college",
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT, 10) || 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  ...(sslOptions ? { ssl: sslOptions } : {})
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection error:", err.message);
    setTimeout(() => process.exit(1), 1000);
  } else {
    console.log("Database connected");
    connection.release();
  }
});

module.exports = db;

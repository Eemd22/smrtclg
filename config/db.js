const mysql = require("mysql2");

const host = process.env.MYSQL_HOST || process.env.DB_HOST || "localhost";
const port = parseInt(process.env.MYSQL_PORT, 10) || parseInt(process.env.DB_PORT, 10) || 3306;
const user = process.env.MYSQL_USER || process.env.DB_USER || "root";
const password = process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || "";
const database = process.env.MYSQL_DATABASE || process.env.DB_NAME || "smart_college";

const sslRequired = String(process.env.MYSQL_SSL || process.env.DB_SSL || "").toLowerCase() === "true";
const caPath = process.env.MYSQL_SSL_CA || process.env.DB_SSL_CA;
const isAiven = String(host || "").includes("aivencloud.com");

let sslOptions;
if (sslRequired) {
  sslOptions = {
    minVersion: "TLSv1.2",
    ...(caPath ? { ca: require("fs").readFileSync(caPath, "utf8") } : {}),
    rejectUnauthorized: Boolean(caPath) || process.env.MYSQL_SSL_STRICT === "true",
  };
} else if (isAiven) {
  // Aiven يتطلب SSL إلزامياً حتى لو لم يُضبط المتغير صراحةً
  sslOptions = { rejectUnauthorized: false };
}

const poolConfig = {
  host,
  port,
  user,
  password,
  database,
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT, 10) || 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  ...(sslOptions ? { ssl: sslOptions } : {}),
};

// Aiven يتطلب timeout أطول للاتصال الأولي
if (isAiven) {
  poolConfig.connectTimeout = 30000;
}

const db = mysql.createPool(poolConfig);

db.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection error:", err.message);
    console.error("Host:", host);
    console.error("SSL:", sslRequired ? "enabled" : "disabled");
    console.error("Aiven detected:", isAiven);
  } else {
    console.log("Database connected to:", host);
    console.log("SSL:", sslRequired ? "enabled" : "disabled");
    connection.release();
  }
});

module.exports = db;

const fs = require("fs");
const path = require("path");

if (!fs.existsSync(path.join(__dirname, "..", "node_modules", "mysql2"))) {
  console.error("Run: npm install");
  process.exit(1);
}
const mysql = require("mysql2/promise");

const DUMP_FILE = path.join(__dirname, "..", "db-dump.json");
const BATCH = 100;

function sslConfig() {
  const caPath = process.env.MYSQL_SSL_CA;
  const ca = caPath ? fs.readFileSync(caPath, "utf8") : undefined;
  return {
    minVersion: "TLSv1.2",
    ...(ca ? { ca } : {}),
    rejectUnauthorized: Boolean(ca) || process.env.MYSQL_SSL_STRICT === "true"
  };
}

async function exportDb() {
  const conn = await mysql.createConnection({
    host: process.env.EXPORT_HOST || "localhost",
    port: process.env.EXPORT_PORT || 3306,
    user: process.env.EXPORT_USER || "root",
    password: process.env.EXPORT_PASSWORD || "",
    database: process.env.EXPORT_DATABASE || "smart_college",
    charset: "utf8mb4"
  });

  const [tables] = await conn.query(
    `SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`,
    [conn.config.database]
  );

  const dump = { database: conn.config.database, exportedAt: new Date().toISOString(), tables: [] };
  for (const { name } of tables) {
    const [[create]] = await conn.query(`SHOW CREATE TABLE \`${name}\``);
    const [rows] = await conn.query(`SELECT * FROM \`${name}\``);
    dump.tables.push({ name, createSql: create["Create Table"], rows });
    console.log(`exported ${name}: ${rows.length} rows`);
  }
  await conn.end();

  fs.writeFileSync(DUMP_FILE, JSON.stringify(dump));
  console.log(`\nSaved -> ${DUMP_FILE} (${dump.tables.length} tables)`);
}

async function importDb() {
  if (!fs.existsSync(DUMP_FILE)) {
    console.error(`Dump file not found: ${DUMP_FILE}. Run db:export first.`);
    process.exit(1);
  }
  const dump = JSON.parse(fs.readFileSync(DUMP_FILE, "utf8"));
  const noDrop = process.argv.includes("--no-drop");

  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || "localhost",
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "smart_college",
    charset: "utf8mb4",
    connectionLimit: 4,
    multipleStatements: true,
    ...(String(process.env.MYSQL_SSL || "").toLowerCase() === "true"
      ? { ssl: sslConfig() }
      : {})
  });

  const conn = await pool.getConnection();
  await conn.query("SET FOREIGN_KEY_CHECKS=0; SET NAMES utf8mb4");

  let totalRows = 0;
  for (const table of dump.tables) {
    if (!noDrop) {
      await conn.query(`DROP TABLE IF EXISTS \`${table.name}\``);
    }
    await conn.query(table.createSql);

    const rows = table.rows || [];
    if (rows.length === 0) {
      console.log(`${table.name}: created (empty)`);
      continue;
    }
    const cols = Object.keys(rows[0]);
    const colList = cols.map((c) => `\`${c}\``).join(",");
    const revive = (v) => {
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) return new Date(v);
      if (v && typeof v === "object" && v.type === "Buffer" && Array.isArray(v.data)) return Buffer.from(v.data);
      return v;
    };
    await conn.beginTransaction();
    try {
      for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH);
        const values = [];
        const placeholders = chunk
          .map(() => `(${cols.map(() => "?").join(",")})`)
          .join(",");
        for (const r of chunk) values.push(...cols.map((c) => revive(r[c])));
        await conn.query(
          `INSERT INTO \`${table.name}\` (${colList}) VALUES ${placeholders}`,
          values
        );
      }
      await conn.commit();
      totalRows += rows.length;
      console.log(`${table.name}: imported ${rows.length} rows`);
    } catch (e) {
      await conn.rollback();
      throw new Error(`${table.name}: ${e.message}`);
    }
  }

  await conn.query("SET FOREIGN_KEY_CHECKS=1");
  conn.release();
  await pool.end();
  console.log(`\nDone. ${dump.tables.length} tables, ${totalRows} rows -> ${process.env.MYSQL_HOST}/${process.env.MYSQL_DATABASE}`);
}

(async () => {
  const mode = process.argv[2];
  try {
    if (mode === "export") await exportDb();
    else if (mode === "import") await importDb();
    else {
      console.error("Usage: node scripts/db-transfer.js <export|import> [--no-drop]");
      process.exit(1);
    }
  } catch (e) {
    console.error("FAILED:", e.message);
    process.exit(1);
  }
})();

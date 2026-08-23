// سكربت يصلح أسماء ملفات المحاضرات المخزنة كرموز (mojibake) في جدول lecture
// التشغيل: npm run fix:lecture-titles
const fs = require("fs");
const path = require("path");

if (!fs.existsSync(path.join(__dirname, "..", "node_modules", "mysql2"))) {
  console.error("Run: npm install");
  process.exit(1);
}
const mysql = require("mysql2/promise");
require("dotenv").config();

function sslConfig() {
  const caPath = process.env.MYSQL_SSL_CA;
  const ca = caPath ? fs.readFileSync(caPath, "utf8") : undefined;
  return {
    minVersion: "TLSv1.2",
    ...(ca ? { ca } : {}),
    rejectUnauthorized: Boolean(caPath) || process.env.MYSQL_SSL_STRICT === "true"
  };
}

// هل النص يحتوي محارف مشوهة ناتجة عن latin1 (مثل Ø Ù ÙŠ)؟
function hasMojibake(s) {
  return /[Ã-ÿ]/.test(s);
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "smart_college",
    charset: "utf8mb4",
    ...(String(process.env.MYSQL_SSL || "").toLowerCase() === "true" ? { ssl: sslConfig() } : {})
  });

  const [rows] = await conn.query("SELECT lec_id, lec_title FROM lecture");
  let fixed = 0;
  for (const row of rows) {
    const title = row.lec_title;
    if (!hasMojibake(title)) continue;
    const decoded = Buffer.from(title, "latin1").toString("utf8");
    // نتأكد أن الناتج يحتوي فعلاً حروفاً عربية، وإلا نتجاهل
    if (!/[\u0600-\u06FF]/.test(decoded)) {
      console.log(`skip #${row.lec_id}: "${title}"`);
      continue;
    }
    await conn.query("UPDATE lecture SET lec_title = ? WHERE lec_id = ?", [decoded, row.lec_id]);
    console.log(`fixed #${row.lec_id}: "${title}" -> "${decoded}"`);
    fixed++;
  }

  console.log(`\nDone. ${fixed} rows updated.`);
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

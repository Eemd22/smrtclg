require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const compression = require("compression");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");

// إنشاء مجلدات الرفع
["users", "posts", "boards", "departments", "alboum", "channel", "channelActivity", "lecture"].forEach((dir) => {
    fs.mkdirSync(path.join(__dirname, dir, "uploads"), { recursive: true });
});

const app = express();
app.use(cors());
app.use(compression());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3000;

// فحص صحة الخادم
app.get("/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

// تشخيص مؤقت: يعرض المتغيرات المستخدمة للاتصال (بلا كلمة المرور)
app.get("/dbconfig", (req, res) => {
  res.json({
    host: process.env.MYSQL_HOST || process.env.DB_HOST || null,
    port: process.env.MYSQL_PORT || process.env.DB_PORT || null,
    user: process.env.MYSQL_USER || process.env.DB_USER || null,
    database: process.env.MYSQL_DATABASE || process.env.DB_NAME || null,
    ssl: process.env.MYSQL_SSL || process.env.DB_SSL || null,
    hasMysqlPassword: !!process.env.MYSQL_PASSWORD,
    hasDbPassword: !!process.env.DB_PASSWORD
  });
});

// تقديم الملفات الثابتة مع التخزين المؤقت
const cacheOptions = { maxAge: '7d', etag: true, lastModified: true };
app.use("/users/uploads", express.static("users/uploads", cacheOptions));
app.use("/posts/uploads", express.static("posts/uploads", cacheOptions));
app.use("/boards/uploads", express.static("boards/uploads", cacheOptions));
app.use("/departments/uploads", express.static("departments/uploads", cacheOptions));
app.use("/alboum/uploads", express.static("alboum/uploads", cacheOptions));
app.use("/channel/uploads", express.static("channel/uploads", cacheOptions));
app.use("/channelActivity/uploads", express.static("channelActivity/uploads", cacheOptions));
app.use("/lecture/uploads", express.static("lecture/uploads", cacheOptions));

// إنشاء الخادم و Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
    transports: ["websocket"],
    pingTimeout: 60000,
    pingInterval: 25000
});

io.on("connection", (socket) => {
    socket.on("disconnect", () => {});
});

// تحميل مسارات API
const apiRoutes = require("./routes/api")(io);
app.use("/", apiRoutes);

// ترحيلات المخطط تُ executes عند الإقلاع
const db = require("./config/db");

const runMigrations = async () => {
    const migrations = [
        // جدول التخزين الدائم للصور والمستندات
        `CREATE TABLE IF NOT EXISTS uploads (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            mime VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
            data LONGBLOB NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        "ALTER TABLE channel_activity MODIFY ch_ac_image VARCHAR(255) NULL",
        "ALTER TABLE channels MODIFY channel_image VARCHAR(255) NULL",
    ];

    for (const sql of migrations) {
        try {
            await db.promise().query(sql);
            console.log("Migration applied:", sql.substring(0, 50) + "...");
        } catch (err) {
            console.error("Migration skipped:", err.message);
        }
    }

    // حماية المشرف الأعلى: فرض صلاحيته عند كل إقلاع
    const BOOTSTRAP_ADMIN_EMAIL = process.env.BOOTSTRAP_ADMIN_EMAIL || "emd.eltahir@gmail.com";
    try {
        await db.promise().query("UPDATE users SET roles = ? WHERE email = ? AND roles <> ?", ["مشرف", BOOTSTRAP_ADMIN_EMAIL, "مشرف"]);
        console.log(`Protected admin enforced: ${BOOTSTRAP_ADMIN_EMAIL}`);
    } catch (err) {
        console.error("Admin enforce failed:", err.message);
    }

    // تنظيف الأقسام المكررة
    try {
        await db.promise().query(
            "DELETE FROM departments WHERE id > 6 OR name NOT IN (?, ?, ?, ?, ?, ?)",
            ["نظم معلومات المكتبات", "نظم معلومات المحاسبية", "نظم معلومات الادارية", "هندسة البرمجيات", "علوم الحاسوب", "تقانة المعلومات"]
        );
    } catch (_) {}

    // تنظيف المجتمعات الفارغة
    try {
        await db.promise().query("DELETE FROM channels WHERE channel_name IS NULL OR TRIM(channel_name) = ''");
    } catch (_) {}
};

// تشغيل الترحيلات بعد الاتصال بقاعدة البيانات
db.getConnection((err, connection) => {
    if (err) {
        console.error("Cannot run migrations - DB not connected:", err.message);
        return;
    }
    connection.release();
    runMigrations();
});

// إغلاق نظيف عند إيقاف الخادم
process.on("SIGTERM", () => {
    console.log("SIGTERM received. Shutting down gracefully...");
    server.close(() => {
        db.end(() => {
            console.log("Database connection closed.");
            process.exit(0);
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

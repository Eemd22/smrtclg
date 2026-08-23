
require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const compression = require("compression");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");

["users", "posts", "boards", "departments", "alboum", "channel", "channelActivity", "lecture"].forEach((dir) => {
    fs.mkdirSync(path.join(__dirname, dir, "uploads"), { recursive: true });
});

const app = express();
app.use(cors());
app.use(compression());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3000;

app.get("/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

// Static file serving with caching
const cacheOptions = { maxAge: '7d', etag: true, lastModified: true };
app.use("/users/uploads", express.static("users/uploads", cacheOptions));
app.use("/posts/uploads", express.static("posts/uploads", cacheOptions));
app.use("/boards/uploads", express.static("boards/uploads", cacheOptions));
app.use("/departments/uploads", express.static("departments/uploads", cacheOptions));
app.use("/alboum/uploads", express.static("alboum/uploads", cacheOptions));
app.use("/channel/uploads", express.static("channel/uploads", cacheOptions));
app.use("/channelActivity/uploads", express.static("channelActivity/uploads", cacheOptions));
app.use("/lecture/uploads", express.static("lecture/uploads", cacheOptions));

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

const apiRoutes = require("./routes/api")(io);
app.use("/", apiRoutes);

// ترحيلات المخطط تُنفذ عند الإقلاع لتصحيح قاعدة البيانات تلقائياً
const db = require("./config/db");
const schemaMigrations = [
    // جدول التخزين الدائم للصور والمستندات داخل قاعدة البيانات
    `CREATE TABLE IF NOT EXISTS uploads (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        mime VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
        data LONGBLOB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    "ALTER TABLE channel_activity MODIFY ch_ac_image VARCHAR(255) NULL",
    "ALTER TABLE channels MODIFY channel_image VARCHAR(255) NULL",
];
schemaMigrations.forEach((sql) => {
    db.query(sql, (err) => {
        if (err) console.error("Schema migration failed:", err.message);
        else console.log("Schema migration applied:", sql);
    });
});

// activity_likes: إضافة مفاتيح أجنبية مع ON DELETE CASCADE بعد تنظيف السجلات اليتيمة
db.query(
    "SELECT COUNT(*) AS c FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'activity_likes'",
    (err, rows) => {
        if (err) return console.error("activity_likes FK check failed:", err.message);
        if (rows[0].c > 0) return;
        const steps = [
            "DELETE al FROM activity_likes al LEFT JOIN users u ON al.user_id = u.uuid WHERE u.uuid IS NULL",
            "DELETE al FROM activity_likes al LEFT JOIN activites a ON al.activity_id = a.id WHERE a.id IS NULL",
            "ALTER TABLE activity_likes ADD CONSTRAINT fk_activity_likes_user FOREIGN KEY (user_id) REFERENCES users(uuid) ON DELETE CASCADE",
            "ALTER TABLE activity_likes ADD CONSTRAINT fk_activity_likes_activity FOREIGN KEY (activity_id) REFERENCES activites(id) ON DELETE CASCADE",
        ];
        steps.forEach((sql) => {
            db.query(sql, (e) => {
                if (e) console.error("activity_likes migration failed:", e.message);
                else console.log("Schema migration applied:", sql);
            });
        });
    }
);

// ضمان حذف بيانات أي جدول مرتبط بالمستخدم إجبارياً (ON DELETE CASCADE)
// تنظيف السجلات اليتيمة ثم إضافة المفتاح الأجنبي لكل جدول يفتقده
const userCascadeTables = [
    ["posts", "user_id"],
    ["comments", "user_id"],
    ["likes", "user_id"],
    ["board", "user_id"],
    ["activites", "user_id"],
    ["channels", "user_id"],
    ["channel_activity", "ch_ac_auther"],
    ["albums", "user_id"],
];

userCascadeTables.forEach(([table, column]) => {
    db.query(
        `SELECT COUNT(*) AS c FROM information_schema.REFERENTIAL_CONSTRAINTS
         WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME = 'users'`,
        [table],
        (err, rows) => {
            if (err) return console.error(`${table} user FK check failed:`, err.message);
            if (rows[0].c > 0) return;
            const steps = [
                `DELETE t FROM ${table} t LEFT JOIN users u ON t.${column} = u.uuid WHERE u.uuid IS NULL`,
                `ALTER TABLE ${table} ADD CONSTRAINT fk_${table}_user FOREIGN KEY (${column}) REFERENCES users(uuid) ON DELETE CASCADE`,
            ];
            steps.forEach((sql) => {
                db.query(sql, (e) => {
                    if (e) console.error(`${table} user-cascade migration failed:`, e.message);
                    else console.log("Schema migration applied:", sql);
                });
            });
        }
    );
});

// حماية المشرف الأعلى: فرض صلاحيته عند كل إقلاع مهما حدث
// + ترقية أول مشرف تلقائياً إذا لم يوجد أي مشرف في قاعدة البيانات
const BOOTSTRAP_ADMIN_EMAIL = process.env.BOOTSTRAP_ADMIN_EMAIL || "emad@gmail.com";
db.query(
    "UPDATE users SET roles = ? WHERE email = ? AND roles <> ?",
    ["مشرف", BOOTSTRAP_ADMIN_EMAIL, "مشرف"],
    (fErr, fRes) => {
        if (fErr) return console.error("Protected admin enforce failed:", fErr.message);
        if (fRes.affectedRows > 0) console.log(`Protected admin enforced as مشرف: ${BOOTSTRAP_ADMIN_EMAIL}`);
        db.query("SELECT COUNT(*) AS c FROM users WHERE roles = ?", ["مشرف"], (bErr, bRows) => {
            if (bErr) return console.error("Bootstrap admin check failed:", bErr.message);
            if (bRows[0].c > 0) return;
            console.log(`Bootstrap admin: no supervisor found for ${BOOTSTRAP_ADMIN_EMAIL}`);
        });
    }
);

// تنظيف الأقسام: حذف الأقسام المكررة/التالفة والاحتفاظ بالأقسام الرسمية فقط
// 1 نظم معلومات المكتبات، 2 نظم معلومات المحاسبية، 3 نظم معلومات الادارية
// 4 هندسة البرمجيات، 5 علوم الحاسوب، 6 تقانة المعلومات
db.query(
    "DELETE FROM departments WHERE id > 6 OR name NOT IN (?, ?, ?, ?, ?, ?)",
    [
        "نظم معلومات المكتبات",
        "نظم معلومات المحاسبية",
        "نظم معلومات الادارية",
        "هندسة البرمجيات",
        "علوم الحاسوب",
        "تقانة المعلومات",
    ],
    (err, result) => {
        if (err) console.error("Departments cleanup failed:", err.message);
        else if (result.affectedRows > 0) console.log("Departments cleanup removed:", result.affectedRows);
    }
);

// تنظيف المجتمعات: حذف المجتمعات المحفوظة بدون اسم (بيانات تالفة من إصدار قديم
// كان يسمح بالحفظ باسم فارغ) - الأنشطة المرتبطة تُحذف تلقائياً بواسطة ON DELETE CASCADE
db.query(
    "DELETE FROM channels WHERE channel_name IS NULL OR TRIM(channel_name) = ''",
    (err, result) => {
        if (err) console.error("Channels cleanup failed:", err.message);
        else if (result.affectedRows > 0) console.log("Channels cleanup removed:", result.affectedRows);
    }
);

// إصلاح أسماء المحاضرات المخزنة كرموز (mojibake): إصدارات قديمة كانت تفك اسم الملف
// العربي بترميز latin1 قبل حفظه، هنا نعيد تحويله إلى UTF-8 عند كل إقلاع (idempotent)
db.query("SELECT lec_id, lec_title, lec_url FROM lecture", (err, rows) => {
    if (err) return console.error("Lecture titles repair failed:", err.message);
    rows.forEach((row) => {
        const fixes = {};
        ["lec_title", "lec_url"].forEach((col) => {
            const value = row[col];
            if (!value || !/[\u0080-\u00FF]/.test(value)) return;
            const decoded = Buffer.from(value, "latin1").toString("utf8");
            // نطبق الإصلاح فقط إذا كان النص الناتج يحتوي فعلاً حروفاً عربية
            if (decoded !== value && /[\u0600-\u06FF]/.test(decoded)) fixes[col] = decoded;
        });
        if (!Object.keys(fixes).length) return;
        const setSql = Object.keys(fixes).map((c) => `${c} = ?`).join(", ");
        db.query(
            `UPDATE lecture SET ${setSql} WHERE lec_id = ?`,
            [...Object.values(fixes), row.lec_id],
            (uErr) => {
                if (uErr) return console.error(`Lecture #${row.lec_id} repair failed:`, uErr.message);
                console.log(`Lecture repaired #${row.lec_id}: "${row.lec_title}" -> "${fixes.lec_title ?? row.lec_title}"`);
            }
        );
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


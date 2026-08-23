
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
    "ALTER TABLE channel_activity MODIFY ch_ac_image VARCHAR(255) NULL",
    "ALTER TABLE channels MODIFY channel_image VARCHAR(255) NULL",
];
schemaMigrations.forEach((sql) => {
    db.query(sql, (err) => {
        if (err) console.error("Schema migration failed:", err.message);
        else console.log("Schema migration applied:", sql);
    });
});

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

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


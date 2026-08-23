const path = require("path");
const db = require("../config/db");

// الحد الأقصى لحجم الملف: 10 ميجابايت
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

// استخراج امتداد آمن من اسم الملف الأصلي (حروف وأرقام فقط وبطول معقول)
function safeExtension(originalName) {
    const ext = path.extname(String(originalName || "")).toLowerCase();
    return /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : "";
}

/**
 * يحفظ الملف في جدول uploads بقاعدة البيانات (تخزين دائم لا يُمسح)
 * ويعيد مساراً افتراضياً بالشكل db/<id><ext> يُخزن في أعمدة الصور،
 * مثل: db/42.jpg أو db/57.pdf حتى تبقى منطقة العرض والتنزيل كما هي
 */
function saveUpload(file) {
    return new Promise((resolve, reject) => {
        if (!file || !file.buffer) return reject(new Error("No file buffer provided"));
        const mime = String(file.mimetype || "application/octet-stream").slice(0, 100);
        db.query(
            "INSERT INTO uploads (mime, data) VALUES (?, ?)",
            [mime, file.buffer],
            (err, result) => {
                if (err) return reject(err);
                resolve(`db/${result.insertId}${safeExtension(file.originalname)}`);
            }
        );
    });
}

/**
 * يعيد مسار الملف المرفوع من req.file بعد حفظه في قاعدة البيانات
 * توحيد نقطة الحصول على المسار في كل الكنترولرات
 */
async function resolveUploadPath(req) {
    if (!req.file || !req.file.buffer) return null;
    return saveUpload(req.file);
}

/**
 * يجلب ملفاً من جدول uploads بواسطة المعرف (يقبل id مسبوقاً بامتداد)
 */
function getUpload(id) {
    return new Promise((resolve, reject) => {
        db.query("SELECT mime, data FROM uploads WHERE id=?", [parseInt(id, 10)], (err, rows) => {
            if (err) return reject(err);
            resolve(rows && rows[0] ? rows[0] : null);
        });
    });
}

/**
 * يحذف ملفاً من قاعدة البيانات إن كان المسار بصيغة db/<id> أو db/<id><ext>
 */
function deleteUpload(relPath) {
    const m = /^db\/(\d+)(?:\.[a-zA-Z0-9]{1,10})?$/.exec(String(relPath || ""));
    if (!m) return;
    db.query("DELETE FROM uploads WHERE id=?", [m[1]], () => {});
}

module.exports = { saveUpload, resolveUploadPath, getUpload, deleteUpload, MAX_UPLOAD_SIZE };

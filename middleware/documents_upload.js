const multer = require("multer");
const path = require("path");
const { MAX_UPLOAD_SIZE } = require("../services/db-storage.service");

// التخزين في الذاكرة ثم حفظه في قاعدة البيانات (تخزين دائم)
const storage = multer.memoryStorage();

// الامتدادات المسموح بها فقط (مطابقة لفلترة التطبيق)
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        const err = new Error("نوع الملف غير مدعوم، المسموح: PDF, DOC, DOCX, PPT, PPTX");
        err.code = "UNSUPPORTED_FILE_TYPE";
        return cb(err);
    }
    cb(null, true);
};

const alboum = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: MAX_UPLOAD_SIZE },
});

module.exports = alboum;

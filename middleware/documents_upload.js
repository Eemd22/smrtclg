const multer = require("multer");
const path = require("path");

// الامتدادات المسموح بها فقط (مطابقة لفلترة التطبيق)
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];

// الحد الأقصى لحجم الملف: 25 ميجابايت
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "lecture/uploads/");
    },

    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + path.extname(file.originalname));
    },
});

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
    limits: { fileSize: MAX_FILE_SIZE },
});

module.exports = alboum;

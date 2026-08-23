const multer = require("multer");
const { MAX_UPLOAD_SIZE } = require("../services/db-storage.service");

// التخزين في الذاكرة ثم حفظه في قاعدة البيانات (تخزين دائم)
const storage = multer.memoryStorage();

const upload = multer({ storage: storage, limits: { fileSize: MAX_UPLOAD_SIZE } });
module.exports = upload;

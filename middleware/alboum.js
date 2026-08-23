const multer = require("multer");
const path = require("path");
const { isConfigured } = require("../services/cloudinary.service");

// عند توفر مفاتيح Cloudinary نرفع في الذاكرة ثم إلى السحابة
// وإلا نستخدم التخزين المحلي كالمعتاد
const storage = isConfigured()
    ? multer.memoryStorage()
    : multer.diskStorage({
          destination: (req, file, cb) => {
              cb(null, "alboum/uploads/");
          },
          filename: (req, file, cb) => {
              cb(null, Date.now() + path.extname(file.originalname));
          },
      });

const alboum = multer({ storage: storage });

module.exports = alboum;

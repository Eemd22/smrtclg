const crypto = require("crypto");

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const FOLDER = process.env.CLOUDINARY_FOLDER || "smartclg";

// الخدمة تعمل فقط عند توفر مفاتيح Cloudinary في متغيرات البيئة
function isConfigured() {
  return Boolean(CLOUD_NAME && API_KEY && API_SECRET);
}

/**
 * يرفع صورة على Cloudinary ويعيد الرابط الآمن الكامل
 * file: كائن multer من memoryStorage (يحتوي buffer + mimetype)
 */
async function uploadImage(file) {
  if (!isConfigured()) throw new Error("Cloudinary is not configured");
  if (!file || !file.buffer) throw new Error("No file buffer provided");

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `folder=${FOLDER}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash("sha1")
    .update(paramsToSign + API_SECRET)
    .digest("hex");

  const form = new FormData();
  form.append(
    "file",
    new Blob([file.buffer], { type: file.mimetype || "image/jpeg" }),
    file.originalname || "upload.jpg"
  );
  form.append("api_key", API_KEY);
  form.append("timestamp", String(timestamp));
  form.append("folder", FOLDER);
  form.append("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: form }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Cloudinary upload failed (${res.status}): ${detail}`);
  }

  const data = await res.json();
  return data.secure_url;
}

module.exports = { isConfigured, uploadImage };

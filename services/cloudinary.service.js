const crypto = require("crypto");
const path = require("path");

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const FOLDER = process.env.CLOUDINARY_FOLDER || "smartclg";

// الخدمة تعمل فقط عند توفر مفاتيح Cloudinary في متغيرات البيئة
function isConfigured() {
  return Boolean(CLOUD_NAME && API_KEY && API_SECRET);
}

/**
 * يرفع ملفاً على Cloudinary ويعيد الرابط الآمن الكامل
 * resourceType: "image" للصور أو "raw" للمستندات (pdf/docx/pptx...)
 * file: كائن multer من memoryStorage (يحتوي buffer + mimetype)
 */
async function uploadFile(file, resourceType = "image") {
  if (!isConfigured()) throw new Error("Cloudinary is not configured");
  if (!file || !file.buffer) throw new Error("No file buffer provided");

  const timestamp = Math.floor(Date.now() / 1000);
  // public_id آمن (ASCII فقط) مع الحفاظ على الامتداد الأصلي
  // ملاحظة: التوقيع يجب أن يشمل كل المتغيرات المرسلة مرتبة أبجدياً
  const ext = path.extname(file.originalname || "").toLowerCase();
  const publicId = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
  const paramsToSign = `folder=${FOLDER}&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash("sha1")
    .update(paramsToSign + API_SECRET)
    .digest("hex");

  const form = new FormData();
  form.append(
    "file",
    new Blob([file.buffer], { type: file.mimetype || "application/octet-stream" }),
    Buffer.from(file.originalname || "upload", "latin1").toString("utf8")
  );
  form.append("api_key", API_KEY);
  form.append("timestamp", String(timestamp));
  form.append("folder", FOLDER);
  form.append("public_id", publicId);
  form.append("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    { method: "POST", body: form }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Cloudinary upload failed (${res.status}): ${detail}`);
  }

  const data = await res.json();
  return data.secure_url;
}

/**
 * يرفع صورة على Cloudinary ويعيد الرابط الآمن الكامل
 * file: كائن multer من memoryStorage (يحتوي buffer + mimetype)
 */
async function uploadImage(file) {
  return uploadFile(file, "image");
}

/**
 * يعيد مسار الملف المرفوع: رابط سحابي عند توفر مفاتيح Cloudinary،
 * وإلا المسار المحلي التقليدي (folder/uploads/filename)
 * يوحّد طريقة الحصول على المسار في كل الكنترولرات
 */
async function resolveUploadPath(req, folder) {
  if (!req.file) return null;
  if (req.file.buffer && isConfigured()) return uploadImage(req.file);
  return `${folder}/uploads/${req.file.filename}`;
}

/**
 * يرفع مستنداً (pdf/doc/docx/ppt/pptx) على Cloudinary ويعيد الرابط الآمن الكامل
 */
async function uploadDocument(file) {
  return uploadFile(file, "raw");
}

/**
 * يستخرج public_id من رابط Cloudinary (بدون امتداد الصور)
 * يعيد null إن لم يكن الرابط من Cloudinary
 */
function publicIdFromUrl(url) {
  try {
    const u = new URL(url);
    const marker = "/upload/";
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    let rest = decodeURIComponent(u.pathname.slice(idx + marker.length));
    rest = rest.replace(/^v\d+\//, ""); // إزالة رقم الإصدار
    return rest.replace(/\.[a-zA-Z0-9]+$/, "");
  } catch (_) {
    return null;
  }
}

/**
 * يحذف ملفاً من Cloudinary عبر رابطه الكامل
 * يتجاهل المسارات المحلية القديمة بصمت
 */
async function deleteFile(url) {
  if (!url || !isConfigured()) return;
  if (!/^https?:\/\//i.test(String(url))) return;
  const publicId = publicIdFromUrl(String(url));
  if (!publicId) return;
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    // التوقيع يجب أن يشمل كل المتغيرات المرسلة مرتبة أبجدياً
    const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}`;
    const signature = crypto
      .createHash("sha1")
      .update(paramsToSign + API_SECRET)
      .digest("hex");

    const form = new FormData();
    form.append("api_key", API_KEY);
    form.append("timestamp", String(timestamp));
    form.append("public_id", publicId);
    form.append("signature", signature);

    await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
      method: "POST",
      body: form,
    });
  } catch (_) {}
}

module.exports = {
  isConfigured,
  uploadImage,
  uploadDocument,
  resolveUploadPath,
  deleteFile,
};

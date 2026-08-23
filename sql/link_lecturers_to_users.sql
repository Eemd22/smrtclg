-- ============================================
-- ربط جدول المحاضرين (lecturers) بحسابات المستخدمين
-- أي مستخدم يحمل دور "محاضر" في جدول users يصبح محاضراً قابلاً للاختيار
-- شغّل هذا الملف مرة واحدة على قاعدة البيانات
-- ============================================

-- 1. إضافة عمود ربط المستخدم (نفس نوع users.uuid)
ALTER TABLE lecturers ADD COLUMN user_id VARCHAR(36) DEFAULT NULL;

-- 2. فهرس فريد + مفتاح أجنبي: كل مستخدم مرتبط بسجل محاضر واحد فقط
ALTER TABLE lecturers ADD UNIQUE KEY uq_lecturers_user_id (user_id);
ALTER TABLE lecturers
  ADD CONSTRAINT fk_lecturers_user
  FOREIGN KEY (user_id) REFERENCES users(uuid)
  ON DELETE SET NULL;

-- 3. ترحيل: إنشاء سجل محاضر لكل مستخدم حالي بدور "محاضر"
INSERT INTO lecturers (lecturer_name, user_id)
SELECT u.username, u.uuid
FROM users u
LEFT JOIN lecturers l ON l.user_id = u.uuid
WHERE u.roles = 'محاضر' AND l.id IS NULL;

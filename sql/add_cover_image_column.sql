-- إضافة عمود صورة الخلفية لجدول المستخدمين
ALTER TABLE users ADD COLUMN cover_image VARCHAR(500) DEFAULT NULL;

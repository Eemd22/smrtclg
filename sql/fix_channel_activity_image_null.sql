-- إصلاح: السماح بنشر منشورات المجتمع بدون صورة
-- الخطأ: ER_BAD_NULL_ERROR: Column 'ch_ac_image' cannot be null
-- نفّذ هذا الملف يدوياً إذا أردت التصحيح فوراً بدون انتظار إعادة نشر الخادم

ALTER TABLE channel_activity MODIFY ch_ac_image VARCHAR(255) NULL;

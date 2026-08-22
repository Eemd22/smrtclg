-- ============================================
-- بيانات تجريبية للمحاضرات والمعامل
-- مجموعة محاضرات و معامل بحالات مختلفة في ايام مختلفة
-- ============================================

-- ============================================
-- 1. الأقسام
-- ============================================
INSERT INTO departments (name) VALUES
  ('علوم الحاسب'),
  ('هندسة البرمجيات'),
  ('شبكات الحاسب'),
  ('أمن المعلومات'),
  ('الذكاء الاصطناعي')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================
-- 2. السنوات الأكاديمية
-- ============================================
INSERT INTO academic_years (year_name) VALUES
  ('السنة الأولى'),
  ('السنة الثانية'),
  ('السنة الثالثة'),
  ('السنة الرابعة')
ON DUPLICATE KEY UPDATE year_name = VALUES(year_name);

-- ============================================
-- 3. المجموعات
-- ============================================
INSERT INTO groups_table (group_name) VALUES
  ('المجموعة أ'),
  ('المجموعة ب'),
  ('المجموعة ج'),
  ('المجموعة د')
ON DUPLICATE KEY UPDATE group_name = VALUES(group_name);

-- ============================================
-- 4. القاعات
-- ============================================
INSERT INTO halls (hall_name) VALUES
  ('قاعة 101'),
  ('قاعة 102'),
  ('قاعة 201'),
  ('قاعة 202'),
  ('معمل الحاسب 1'),
  ('معمل الحاسب 2'),
  ('معمل الشبكات'),
  ('معمل البرمجيات'),
  ('معمل الأمن السيبراني'),
  ('معمل الذكاء الاصطناعي'),
  ('قاعة المحاضرات الكبرى')
ON DUPLICATE KEY UPDATE hall_name = VALUES(hall_name);

-- ============================================
-- 5. المدرسين
-- ============================================
INSERT INTO lecturers (lecturer_name) VALUES
  ('د. أحمد محمد علي'),
  ('د. فاطمة حسن أحمد'),
  ('د. خالد عبدالله سعيد'),
  ('د. نورة سالم محمد'),
  ('د. محمد إبراهيم خالد'),
  ('د. سارة يوسف أحمد'),
  ('د. عمر حامد نور'),
  ('د. هند عبدالرحمن')
ON DUPLICATE KEY UPDATE lecturer_name = VALUES(lecturer_name);

-- ============================================
-- 6. المقررات
-- ============================================
INSERT INTO courses (course_name) VALUES
  ('برمجة الويب'),
  ('هياكل البيانات'),
  ('قواعد البيانات'),
  ('شبكات الحاسب'),
  ('أنظمة التشغيل'),
  ('البرمجة بلغة Python'),
  ('أمن المعلومات'),
  ('الذكاء الاصطناعي'),
  ('هندسة البرمجيات'),
  ('التعلم الآلي'),
  ('البرمجة بلغة C++'),
  ('مقدمة في الحاسب')
ON DUPLICATE KEY UPDATE course_name = VALUES(course_name);

-- ============================================
-- 7. المحاضرات والمعامل (حالات مختلفة في أيام مختلفة)
-- ============================================

-- ──────────────────────────────────────────
-- السبت Saturday - محاضرات و معامل
-- ──────────────────────────────────────────

-- محاضرة نظرية - قادمة
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('مقدمة في البرمجة', 'Saturday', '08:00:00', '10:00:00', 'theory', 'scheduled', 12, 1, 1, 1, 1, 1);

-- معمل عملي - جاري
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('عملية برمجة المبتدئين', 'Saturday', '10:00:00', '12:00:00', 'practical', 'ongoing', 12, 5, 1, 1, 1, 1);

-- محاضرة نظرية - منتهية
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('أساسيات الشبكات', 'Saturday', '13:00:00', '15:00:00', 'theory', 'finished', 4, 3, 3, 3, 2, 2);

-- معمل عملي - ملغي
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('تجربة معملية للشبكات', 'Saturday', '15:00:00', '17:00:00', 'practical', 'cancelled', 4, 7, 3, 3, 2, 2);

-- ──────────────────────────────────────────
-- الأحد Sunday - محاضرات و معامل
-- ──────────────────────────────────────────

-- محاضرة نظرية - قادمة
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('هياكل البيانات المتقدمة', 'Sunday', '08:00:00', '10:00:00', 'theory', 'scheduled', 2, 1, 2, 1, 2, 1);

-- معمل عملي - جاري
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('تطبيق هياكل البيانات', 'Sunday', '10:00:00', '12:00:00', 'practical', 'ongoing', 2, 6, 2, 1, 2, 1);

-- محاضرة نظرية - منتهية
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('أنظمة التشغيل - المحاضرة الأولى', 'Sunday', '13:00:00', '15:00:00', 'theory', 'finished', 5, 3, 4, 1, 2, 2);

-- معمل عملي - قادم
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('تثبيت أنظمة التشغيل', 'Sunday', '15:00:00', '17:00:00', 'practical', 'scheduled', 5, 6, 4, 1, 2, 2);

-- ──────────────────────────────────────────
-- الاثنين Monday - محاضرات و معامل
-- ──────────────────────────────────────────

-- محاضرة نظرية - جاري
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('برمجة الويب باستخدام HTML/CSS', 'Monday', '08:00:00', '10:00:00', 'theory', 'ongoing', 1, 1, 5, 1, 1, 1);

-- معمل عملي - منتهي
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('ورشة عمل تطوير الويب', 'Monday', '10:00:00', '12:00:00', 'practical', 'finished', 1, 8, 5, 2, 2, 1);

-- محاضرة نظرية - ملغي
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('أمن الشبكات', 'Monday', '13:00:00', '15:00:00', 'theory', 'cancelled', 7, 3, 6, 4, 3, 3);

-- معمل عملي - قادم
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('معمل الاختراق الأخلاقي', 'Monday', '15:00:00', '17:00:00', 'practical', 'scheduled', 7, 9, 6, 4, 3, 3);

-- ──────────────────────────────────────────
-- الثلاثاء Tuesday - محاضرات و معامل
-- ──────────────────────────────────────────

-- محاضرة نظرية - منتهية
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('قواعد البيانات العلائقية', 'Tuesday', '08:00:00', '10:00:00', 'theory', 'finished', 3, 1, 7, 1, 2, 2);

-- معمل عملي - قادم
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('تطبيق قواعد البيانات MySQL', 'Tuesday', '10:00:00', '12:00:00', 'practical', 'scheduled', 3, 6, 7, 1, 2, 2);

-- محاضرة نظرية - جاري
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('مقدمة في الذكاء الاصطناعي', 'Tuesday', '13:00:00', '15:00:00', 'theory', 'ongoing', 8, 11, 8, 5, 3, 1);

-- معمل عملي - منتهي
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('معمل التعلم الآلي الأول', 'Tuesday', '15:00:00', '17:00:00', 'practical', 'finished', 10, 10, 8, 5, 3, 1);

-- ──────────────────────────────────────────
-- الأربعاء Wednesday - محاضرات و معامل
-- ──────────────────────────────────────────

-- محاضرة نظرية - ملغي
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('البرمجة بلغة C++', 'Wednesday', '08:00:00', '10:00:00', 'theory', 'cancelled', 11, 1, 1, 1, 1, 1);

-- معمل عملي - جاري
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('برمجة بلغة Python للمبتدئين', 'Wednesday', '10:00:00', '12:00:00', 'practical', 'ongoing', 6, 8, 2, 1, 1, 1);

-- محاضرة نظرية - قادم
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('هندسة البرمجيات', 'Wednesday', '13:00:00', '15:00:00', 'theory', 'scheduled', 9, 3, 5, 2, 3, 2);

-- معمل عملي - منتهي
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('ورشة هندسة البرمجيات', 'Wednesday', '15:00:00', '17:00:00', 'practical', 'finished', 9, 8, 5, 2, 3, 2);

-- ──────────────────────────────────────────
-- الخميس Thursday - محاضرات و معامل
-- ──────────────────────────────────────────

-- محاضرة نظرية - جاري
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('أمن المعلومات المتقدم', 'Thursday', '08:00:00', '10:00:00', 'theory', 'ongoing', 7, 3, 6, 4, 3, 3);

-- معمل عملي - قادم
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('معمل تشفير البيانات', 'Thursday', '10:00:00', '12:00:00', 'practical', 'scheduled', 7, 9, 6, 4, 3, 3);

-- محاضرة نظرية - منتهية
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('التعلم العميق', 'Thursday', '13:00:00', '15:00:00', 'theory', 'finished', 10, 11, 8, 5, 4, 1);

-- معمل عملي - ملغي
INSERT INTO lectures (lecture_title, lecture_day, start_time, end_time, lecture_type, status, course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
VALUES ('معمل الشبكات العصبية', 'Thursday', '15:00:00', '17:00:00', 'practical', 'cancelled', 10, 10, 8, 5, 4, 1);

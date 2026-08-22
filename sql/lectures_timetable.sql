-- إضافة عمود status لجدول lectures
ALTER TABLE lectures ADD COLUMN status ENUM('scheduled','ongoing','finished','cancelled') DEFAULT 'scheduled';

-- إضافة department_id و group_id لجدول users لربط الطالب بقسمه وفرقته
ALTER TABLE users ADD COLUMN department_id INT DEFAULT NULL;
ALTER TABLE users ADD COLUMN group_id INT DEFAULT NULL;
ALTER TABLE users ADD FOREIGN KEY (department_id) REFERENCES departments(id);
ALTER TABLE users ADD FOREIGN KEY (group_id) REFERENCES groups_table(id);

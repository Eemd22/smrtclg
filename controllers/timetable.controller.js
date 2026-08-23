const db = require("../config/db");

const dayOffsets = {
  Saturday: 0,
  Sunday: 1,
  Monday: 2,
  Tuesday: 3,
  Wednesday: 4,
  Thursday: 5,
  Friday: 6,
};

function getNextOccurrence(lectureDay, timeStr) {
  const now = new Date();
  const [hours, minutes, seconds] = timeStr.split(":").map(Number);
  const offset = dayOffsets[lectureDay];
  if (offset === undefined) return null;

  const result = new Date(now);
  result.setHours(hours, minutes, seconds || 0, 0);

  const currentDay = now.getDay();
  const targetDay = offset === 6 ? 0 : offset + 1;
  let daysAhead = targetDay - currentDay;
  if (daysAhead < 0) daysAhead += 7;
  if (daysAhead === 0 && result <= now) daysAhead = 7;

  result.setDate(result.getDate() + daysAhead);
  return result;
}

function computeStatus(lectureDay, startTime, endTime, dbStatus) {
  if (dbStatus === "cancelled") return "cancelled";
  if (dbStatus === "finished") return "finished";

  const now = new Date();
  const start = getNextOccurrence(lectureDay, startTime);
  const end = getNextOccurrence(lectureDay, endTime);

  if (!start || !end) return "scheduled";

  if (now < start) return "scheduled";
  if (now >= start && now <= end) return "ongoing";
  return "finished";
}

exports.getlectures = (req, res, io) => {
  const { department_id, group_id, day } = req.query;

  let whereClauses = [];
  let params = [];

  if (department_id) {
    whereClauses.push("lectures.department_id = ?");
    params.push(department_id);
  }
  if (group_id) {
    whereClauses.push("lectures.group_id = ?");
    params.push(group_id);
  }
  if (day) {
    whereClauses.push("lectures.lecture_day = ?");
    params.push(day);
  }

  const whereSQL =
    whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

  const query = `
    SELECT
      lectures.id,
      lectures.lecture_title,
      lectures.lecture_day,
      lectures.start_time,
      lectures.end_time,
      lectures.lecture_type,
      lectures.status,
      courses.course_name,
      halls.hall_name,
      lecturers.lecturer_name,
      departments.name,
      academic_years.year_name,
      groups_table.group_name
    FROM lectures
    LEFT JOIN courses ON lectures.course_id = courses.id
    LEFT JOIN halls ON lectures.hall_id = halls.id
    LEFT JOIN lecturers ON lectures.lecturer_id = lecturers.id
    LEFT JOIN departments ON lectures.department_id = departments.id
    LEFT JOIN academic_years ON lectures.academic_year_id = academic_years.id
    LEFT JOIN groups_table ON lectures.group_id = groups_table.id
    ${whereSQL}
    ORDER BY FIELD(lectures.lecture_day, 'Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday'), lectures.start_time ASC
  `;

  db.query(query, params, (err, result) => {
    if (err) return res.status(500).json(err);

    const updated = result.map((row) => ({
      ...row,
      status: computeStatus(
        row.lecture_day,
        row.start_time,
        row.end_time,
        row.status
      ),
    }));

    res.json(updated);
  });
};

exports.updateLectureStatus = (req, res, io) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["scheduled", "ongoing", "finished", "cancelled"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  db.query(
    "UPDATE lectures SET status = ? WHERE id = ?",
    [status, id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      io.emit("dataChanged", { table: "lectures" });
      res.json({ message: "Status updated", status });
    }
  );
};

// ############### إدارة جدول المحاضرات (CRUD كامل) ###############

const VALID_DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];
const VALID_TYPES = ["theory", "practical"];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

// التحقق من صحة بيانات المحاضرة قبل الإضافة/التعديل
function validateLecturePayload(body, cb) {
  const title = (body.lecture_title || "").toString().trim();
  if (!title) return cb("عنوان المحاضرة مطلوب");

  const day = body.lecture_day;
  if (!VALID_DAYS.includes(day)) return cb("يوم المحاضرة غير صالح");

  const startTime = body.start_time;
  const endTime = body.end_time;
  if (!TIME_RE.test(startTime || "")) return cb("وقت البداية غير صالح");
  if (!TIME_RE.test(endTime || "")) return cb("وقت النهاية غير صالح");
  if (startTime.slice(0, 5) >= endTime.slice(0, 5))
    return cb("وقت النهاية يجب أن يكون بعد وقت البداية");

  const type = body.lecture_type;
  if (!VALID_TYPES.includes(type)) return cb("نوع المحاضرة غير صالح");

  const course_id = Number(body.course_id);
  const hall_id = Number(body.hall_id);
  const lecturer_id = Number(body.lecturer_id);
  const department_id = Number(body.department_id);
  const academic_year_id = Number(body.academic_year_id);
  const group_id = body.group_id ? Number(body.group_id) : null;

  if (!course_id) return cb("المقرر مطلوب");
  if (!hall_id) return cb("القاعة مطلوبة");
  if (!lecturer_id) return cb("المحاضر مطلوب");
  if (!department_id) return cb("القسم مطلوب");
  if (!academic_year_id) return cb("السنة الدراسية مطلوبة");

  cb(null, {
    lecture_title: title,
    lecture_day: day,
    start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
    end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
    lecture_type: type,
    course_id,
    hall_id,
    lecturer_id,
    department_id,
    academic_year_id,
    group_id,
  });
}

// جلب القوائم المرجعية لملء النماذج (مقررات، قاعات، محاضرون، أقسام، سنوات، مجموعات)
exports.getReferences = (req, res) => {
  db.query("SELECT id, course_name AS name FROM courses ORDER BY course_name", (err, courses) => {
    if (err) return res.status(500).json({ message: "خطأ في جلب المقررات" });
    db.query("SELECT id, hall_name AS name FROM halls ORDER BY hall_name", (err2, halls) => {
      if (err2) return res.status(500).json({ message: "خطأ في جلب القاعات" });
      db.query("SELECT id, lecturer_name AS name FROM lecturers ORDER BY lecturer_name", (err3, lecturers) => {
        if (err3) return res.status(500).json({ message: "خطأ في جلب المحاضرين" });
        db.query("SELECT id, name FROM departments ORDER BY name", (err4, departments) => {
          if (err4) return res.status(500).json({ message: "خطأ في جلب الأقسام" });
          db.query("SELECT id, year_name AS name FROM academic_years ORDER BY id", (err5, academic_years) => {
            if (err5) return res.status(500).json({ message: "خطأ في جلب السنوات الدراسية" });
            db.query("SELECT id, group_name AS name FROM groups_table ORDER BY id", (err6, groups) => {
              if (err6) return res.status(500).json({ message: "خطأ في جلب المجموعات" });
              res.json({
                courses,
                halls,
                lecturers,
                departments,
                academic_years,
                groups,
              });
            });
          });
        });
      });
    });
  });
};

// جلب محاضرة واحدة للتعديل
exports.getLectureById = (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM lectures WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ message: "خطأ في جلب المحاضرة" });
    if (!rows || rows.length === 0)
      return res.status(404).json({ message: "المحاضرة غير موجودة" });
    res.json(rows[0]);
  });
};

// إنشاء محاضرة جديدة
exports.addLecture = (req, res, io) => {
  validateLecturePayload(req.body || {}, (error, data) => {
    if (error) return res.status(400).json({ success: false, message: error });

    const sql = `
      INSERT INTO lectures
        (lecture_title, lecture_day, start_time, end_time, lecture_type, status,
         course_id, hall_id, lecturer_id, department_id, academic_year_id, group_id)
      VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.lecture_title,
      data.lecture_day,
      data.start_time,
      data.end_time,
      data.lecture_type,
      data.course_id,
      data.hall_id,
      data.lecturer_id,
      data.department_id,
      data.academic_year_id,
      data.group_id,
    ];

    db.query(sql, params, (err, result) => {
      if (err) {
        console.error("addLecture error:", err.message);
        return res
          .status(500)
          .json({ success: false, message: "فشل إضافة المحاضرة، حاول مجدداً" });
      }
      io.emit("dataChanged", { table: "lectures" });
      res.status(201).json({
        success: true,
        message: "تمت إضافة المحاضرة بنجاح",
        id: result.insertId,
      });
    });
  });
};

// تعديل محاضرة موجودة
exports.updateLecture = (req, res, io) => {
  const { id } = req.params;

  db.query("SELECT id FROM lectures WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: "خطأ في الخادم" });
    if (!rows || rows.length === 0)
      return res.status(404).json({ success: false, message: "المحاضرة غير موجودة" });

    validateLecturePayload(req.body || {}, (error, data) => {
      if (error) return res.status(400).json({ success: false, message: error });

      // عند تعديل الجدول الزمني تُعاد الحالة إلى مجدولة تلقائياً ما لم تكن ملغاة
      db.query(
        "SELECT status FROM lectures WHERE id = ?",
        [id],
        (sErr, sRows) => {
          const currentStatus = !sErr && sRows.length > 0 ? sRows[0].status : null;
          const nextStatus =
            currentStatus === "cancelled" || currentStatus === "finished"
              ? currentStatus
              : "scheduled";

          const sql = `
            UPDATE lectures SET
              lecture_title = ?, lecture_day = ?, start_time = ?, end_time = ?,
              lecture_type = ?, status = ?, course_id = ?, hall_id = ?,
              lecturer_id = ?, department_id = ?, academic_year_id = ?, group_id = ?
            WHERE id = ?
          `;
          const params = [
            data.lecture_title,
            data.lecture_day,
            data.start_time,
            data.end_time,
            data.lecture_type,
            nextStatus,
            data.course_id,
            data.hall_id,
            data.lecturer_id,
            data.department_id,
            data.academic_year_id,
            data.group_id,
            id,
          ];

          db.query(sql, params, (uErr) => {
            if (uErr) {
              console.error("updateLecture error:", uErr.message);
              return res.status(500).json({
                success: false,
                message: "فشل تعديل المحاضرة، حاول مجدداً",
              });
            }
            io.emit("dataChanged", { table: "lectures" });
            res.json({ success: true, message: "تم تعديل المحاضرة بنجاح" });
          });
        }
      );
    });
  });
};

// حذف محاضرة
exports.deleteLecture = (req, res, io) => {
  const { id } = req.params;

  db.query("DELETE FROM lectures WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error("deleteLecture error:", err.message);
      return res
        .status(500)
        .json({ success: false, message: "فشل حذف المحاضرة، حاول مجدداً" });
    }
    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, message: "المحاضرة غير موجودة" });

    io.emit("dataChanged", { table: "lectures" });
    res.json({ success: true, message: "تم حذف المحاضرة بنجاح" });
  });
};

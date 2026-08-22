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
      io.emit("dataChanged");
      res.json({ message: "Status updated", status });
    }
  );
};

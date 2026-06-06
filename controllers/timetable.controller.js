const db = require("../config/db");

  exports.getlectures =(req, res,io) => {

    const query = `

    SELECT

    lectures.id,

    lectures.lecture_title,

    lectures.lecture_day,

    lectures.start_time,

    lectures.end_time,

    lectures.lecture_type,

    courses.course_name,

    halls.hall_name,

    lecturers.lecturer_name,

    departments.name,

    academic_years.year_name,

    groups_table.group_name

    FROM lectures

    LEFT JOIN courses
    ON lectures.course_id = courses.id

    LEFT JOIN halls
    ON lectures.hall_id = halls.id

    LEFT JOIN lecturers
    ON lectures.lecturer_id = lecturers.id

    LEFT JOIN departments
    ON lectures.department_id = departments.id

    LEFT JOIN academic_years
    ON lectures.academic_year_id =
    academic_years.id

    LEFT JOIN groups_table
    ON lectures.group_id =
    groups_table.id

    ORDER BY start_time ASC
    `;

    db.query(query, (err, result) => {
        if (err) return res.status(500).json(err);
            io.emit("dataChanged");
        console.log(result);
        res.json(result);
    });
}



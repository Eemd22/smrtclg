
const db = require("../config/db");

exports.getLecture = (req, res) => {
    const { dept_id, lec_level } = req.query;
    let sql = "SELECT * FROM lecture WHERE 1=1";
    const params = [];
    if (dept_id) {
        sql += " AND (dept_id = ? OR dept_id IS NULL)";
        params.push(dept_id);
    }
    if (lec_level) {
        sql += " AND lec_level = ?";
        params.push(lec_level);
    }
    sql += " ORDER BY created_at DESC";
    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
};

exports.addLecture = (req, res, io) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "No File"
        });
    }
    const originalName = req.file.originalname;
    const savedFileName = req.file.filename;
    const level = req.body.level;
    const deptId = req.body.dept_id || null;
    const groupId = req.body.group_id || null;
    db.query(
        "INSERT INTO lecture(lec_title, lec_url, lec_level, dept_id, group_id) VALUES(?,?,?,?,?)",
        [originalName, savedFileName, level, deptId, groupId],
        (err, result) => {
            if (err) {
                return res.status(500).json(err);
            }
            io.emit("dataChanged");
            res.json({
                success: true,
                file: savedFileName,
            });
        }
    );
};

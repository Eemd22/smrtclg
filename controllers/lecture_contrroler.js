
const db = require("../config/db");
const { resolveUploadPath } = require("../services/db-storage.service");

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

exports.addLecture = async (req, res, io) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "No File"
        });
    }
    // multer يفك اسم الملف بترميز latin1، نعيد تحويله إلى UTF-8 حتى تظهر الأسماء العربية صحيحة
    const originalName = Buffer.from(req.file.originalname, "latin1").toString("utf8");
    const level = req.body.level;
    const deptId = req.body.dept_id || null;
    const groupId = req.body.group_id || null;

    // القرص على Render مؤقت ويُمسح مع كل نشر؛ نحفظ الملف في قاعدة البيانات
    // (تخزين دائم) ونخزن المسار الافتراضي db/<id> في lec_url
    let savedFileName;
    try {
        savedFileName = await resolveUploadPath(req);
    } catch (e) {
        console.error("Lecture DB upload failed:", e.message);
        return res.status(500).json({
            success: false,
            message: "فشل حفظ الملف على الخادم، حاول مجدداً"
        });
    }

    db.query(
        "INSERT INTO lecture(lec_title, lec_url, lec_level, dept_id, group_id) VALUES(?,?,?,?,?)",
        [originalName, savedFileName, level, deptId, groupId],
        (err, result) => {
            if (err) {
                return res.status(500).json(err);
            }
            io.emit("dataChanged", { table: "lecture" });
            res.json({
                success: true,
                file: savedFileName,
            });
        }
    );
};

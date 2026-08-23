const db = require("../config/db");
const { resolveUploadPath } = require("../services/db-storage.service");


// جلب صور الألبوم - العرض يعتمد على القسم المختار
exports.getAlboum = (req, res,io) => {
    const deptId = req.query.dept_id || null;

    const sql = `
        SELECT albums.alboum_id, albums.image, albums.dept_id, albums.user_id,
        departments.name AS dept_name
        FROM albums
        LEFT JOIN departments ON departments.id = albums.dept_id
        ${deptId ? "WHERE albums.dept_id = ?" : ""}
        ORDER BY albums.alboum_id DESC
    `;
    const params = deptId ? [deptId] : [];
    db.query(sql, params,
         (err, result) => {
        if (err) return res.status(500).json(err);

        res.json(result);
    });
};




exports.addAlboum = async (req, res, io) => {

    const { deptid,userid} = req.body;
    if (!deptid || !userid || parseInt(deptid) <= 0) {
        return res.status(400).json({ message: "dept_id and user_id are required" });
    }
    const image = await resolveUploadPath(req);
    console.log(deptid);

    const sql = 'INSERT INTO albums (image, dept_id, user_id) VALUES (?,?,?)';
   db.query(sql, [ image,deptid,userid], (err, result) => {
        if (err) return res.status(500).json(err);

        io.emit("dataChanged", { table: "albums" });

        res.json({ message: "added" });
    });
}



// exports.deleteActivity =  (req, res,io) => {
//   const id = req.params.id;
// const {userid} = req.body;
//   db.query(
//     "DELETE FROM activites WHERE id=? AND user_id=?",
//     [id,userid],
//     (err, result) => {
//       if (err) return res.status(500).json(err);

//       io.emit("dataChanged");
//       console.log("................................gggggggggggggggggggg");
//       res.json({ "message": "deleted" });
//     }
//   );
// };

// delete_activity/$activity_id



// edit activites 



// exports.editActivity =  (req, res,io) => {
//   const id = req.params.id;
 
//   const {activity_content,userid } = req.body;

//   db.query(
//     "UPDATE activites SET activity=? WHERE id=? AND user_id=?",
//     [activity_content,id,userid],
//     (err, result) => {
//       if (err) return res.status(500).json(err);

//       io.emit("dataChanged");
      
//       res.json({ message: "updated" });
//     }
//   );
// };



// add_abboum


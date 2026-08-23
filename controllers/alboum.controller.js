const db = require("../config/db");


exports.getAlboum = (req, res,io) => {
    db.query(` SELECT * FROM albums
    `,
         (err, result) => {
        if (err) return res.status(500).json(err);

        res.json(result);
    });
};




exports.addAlboum = (req, res, io) => {
  
    const { deptid,userid} = req.body;
    const image = req.file ? `alboum/uploads/${req.file.filename}` : null;
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


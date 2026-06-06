const db = require("../config/db");


exports.getActivity = (req, res,io) => {
   const id = req.params.userid;
   
    db.query(` SELECT users.uuid,users.roles, users.username,users.profile,activites.id,activites.activity,activites.image ,activites.created_at,activites.dept_id,activites.user_id FROM activites
         INNER JOIN users  ON activites.user_id =  users.uuid ORDER BY activites.created_at DESC
        
    `,
         [id], (err, result) => {
        if (err) return res.status(500).json(err);
         
        res.json(result);
         io.emit("dataChange");
    });
};




exports.addActivity = (req, res, io) => {
  
    const { activity, user_id ,dept_id} = req.body;
    const image = req.file ? `departments/uploads/${req.file.filename}` : null;
    console.log(dept_id);
   
    const sql = 'INSERT INTO activites (activity, user_id, image, dept_id) VALUES (?,?,?,?)';
   db.query(sql, [activity, user_id, image,dept_id], (err, result) => {
        if (err) return res.status(500).json(err);
        io.emit("dataChanged");
      
        res.json({ message: "added" });
    });
}



exports.deleteActivity =  (req, res,io) => {
  const id = req.params.id;
const {userid} = req.body;
  db.query(
    "DELETE FROM activites WHERE id=? AND user_id=?",
    [id,userid],
    (err, result) => {
      if (err) return res.status(500).json(err);

      io.emit("dataChanged");
      console.log("................................gggggggggggggggggggg");
      res.json({ "message": "deleted" });
    }
  );
};

// delete_activity/$activity_id



// edit activites 



exports.editActivity =  (req, res,io) => {
  const id = req.params.id;
 
  const {activity_content,userid } = req.body;

  db.query(
    "UPDATE activites SET activity=? WHERE id=? AND user_id=?",
    [activity_content,id,userid],
    (err, result) => {
      if (err) return res.status(500).json(err);

      io.emit("dataChanged");
      
      res.json({ message: "updated" });
    }
  );
};



const db = require("../config/db");
const { resolveUploadPath } = require("../services/db-storage.service");


exports.getActivity = (req, res,io) => {
   const userId = req.query.user_id || null;
   const deptId = req.query.dept_id || null;

    const sql = `
        SELECT users.uuid, users.roles, users.username, users.profile,
        activites.id, activites.activity, activites.image, activites.created_at, activites.dept_id, activites.user_id,
        departments.name AS dept_name,
        COALESCE(al.likes_count, 0) AS likes_count,
        COALESCE(al.dislikes_count, 0) AS dislikes_count,
        COALESCE(ac.comments_count, 0) AS comments_count,
        (
            SELECT reaction_type FROM activity_likes
            WHERE activity_id = activites.id AND user_id = ?
            LIMIT 1
        ) AS user_reaction
        FROM activites
        INNER JOIN users ON activites.user_id = users.uuid
        LEFT JOIN departments ON departments.id = activites.dept_id
        LEFT JOIN (
            SELECT activity_id,
                COUNT(CASE WHEN reaction_type = 'like' THEN 1 END) AS likes_count,
                COUNT(CASE WHEN reaction_type = 'dislike' THEN 1 END) AS dislikes_count
            FROM activity_likes
            GROUP BY activity_id
        ) al ON al.activity_id = activites.id
        LEFT JOIN (
            SELECT activity_id, COUNT(*) AS comments_count
            FROM activity_comments
            GROUP BY activity_id
        ) ac ON ac.activity_id = activites.id
        ${deptId ? "WHERE activites.dept_id = ?" : ""}
        ORDER BY activites.created_at DESC
    `;
         const params = deptId ? [userId, deptId] : [userId];
         db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json(err);

        res.json(result);
    });
};




exports.addActivity = async (req, res, io) => {
  
    const { activity, user_id ,dept_id} = req.body;
    if (!activity || !user_id || !dept_id || parseInt(dept_id) <= 0) {
        return res.status(400).json({ message: "activity, user_id and dept_id are required" });
    }
    const image = await resolveUploadPath(req);
    console.log(dept_id);
   
    const sql = 'INSERT INTO activites (activity, user_id, image, dept_id) VALUES (?,?,?,?)';
   db.query(sql, [activity, user_id, image,dept_id], (err, result) => {
        if (err) return res.status(500).json(err);
        io.emit("dataChanged", { table: "activites" });
      
        res.json({ message: "added" });
    });
}



exports.deleteActivity =  (req, res,io) => {
  const id = req.params.id;
  db.query(
    "DELETE FROM activites WHERE id=?",
    [id],
    (err, result) => {
      if (err) return res.status(500).json(err);

      io.emit("dataChanged", { table: "activites" });
      console.log("................................gggggggggggggggggggg");
      res.json({ "message": "deleted" });
    }
  );
};

// delete_activity/$activity_id



// edit activites 



exports.editActivity =  (req, res,io) => {
  const id = req.params.id;
  
  const {activity_content} = req.body;

  db.query(
    "UPDATE activites SET activity=? WHERE id=?",
    [activity_content,id],
    (err, result) => {
      if (err) return res.status(500).json(err);

      io.emit("dataChanged", { table: "activites" });
      
      res.json({ message: "updated" });
    }
  );
};



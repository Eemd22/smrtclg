const db = require("../config/db");

exports.addActivityComment = (req, res, io) => {
  const { activityid, userid, comment } = req.body;

  if (!activityid || !userid || !comment) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  db.query(
    "INSERT INTO activity_comments (activity_id, user_id, comment) VALUES (?,?,?)",
    [activityid, userid, comment],
    (err, result) => {
      if (err) return res.status(500).json(err);

      io.emit("dataChanged");
      res.json({ message: "added", insertId: result.insertId });
    }
  );
};

exports.getActivityComments = (req, res) => {
  const activityId = req.params.activityId;

  const sql = `
    SELECT activity_comments.id, activity_comments.comment, activity_comments.created_at,
           activity_comments.user_id, users.username, users.profile, users.roles
    FROM activity_comments
    INNER JOIN users ON activity_comments.user_id = users.uuid
    WHERE activity_comments.activity_id = ?
    ORDER BY activity_comments.created_at ASC
  `;

  db.query(sql, [activityId], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

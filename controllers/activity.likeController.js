const db = require("../config/db");

exports.addActivityLike = (req, res, io) => {
  const { activityid, userid, type } = req.body;

  if (!activityid || !userid || !type) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (!['like', 'dislike'].includes(type)) {
    return res.status(400).json({ message: 'Invalid reaction type' });
  }

  const checkSql = 'SELECT * FROM activity_likes WHERE activity_id = ? AND user_id = ?';

  db.query(checkSql, [activityid, userid], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      const insertSql = 'INSERT INTO activity_likes (activity_id, user_id, reaction_type) VALUES (?, ?, ?)';

      db.query(insertSql, [activityid, userid, type], (err) => {
        if (err) return res.status(500).json(err);
        io.emit("dataChanged", { table: "activity_likes" });
        return res.json({ message: 'Added successfully' });
      });

    } else {
      const oldType = result[0].reaction_type;

      if (oldType === type) {
        const deleteSql = 'DELETE FROM activity_likes WHERE activity_id = ? AND user_id = ?';

        db.query(deleteSql, [activityid, userid], (err) => {
          if (err) return res.status(500).json(err);
          io.emit("dataChanged", { table: "activity_likes" });
          return res.json({ message: 'Removed' });
        });

      } else {
        const updateSql = 'UPDATE activity_likes SET reaction_type = ? WHERE activity_id = ? AND user_id = ?';

        db.query(updateSql, [type, activityid, userid], (err) => {
          if (err) return res.status(500).json(err);
          io.emit("dataChanged", { table: "activity_likes" });
          res.json({ message: "updated" });
        });
      }
    }
  });
};

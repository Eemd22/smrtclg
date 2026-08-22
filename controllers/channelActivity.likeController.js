const db = require("../config/db");

exports.addChannelActivityLike = (req, res, io) => {
  const { activityid, userid, type } = req.body;

  if (!activityid || !userid || !type) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (!['like', 'dislike', 'love', 'haha', 'wow', 'sad', 'angry'].includes(type)) {
    return res.status(400).json({ message: 'Invalid reaction type' });
  }

  const checkSql = 'SELECT * FROM channel_activity_likes WHERE ch_ac_id = ? AND user_id = ?';

  db.query(checkSql, [activityid, userid], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      const insertSql = 'INSERT INTO channel_activity_likes (ch_ac_id, user_id, reaction_type) VALUES (?, ?, ?)';

      db.query(insertSql, [activityid, userid, type], (err) => {
        if (err) return res.status(500).json(err);
        io.emit("dataChanged");
        return res.json({ message: 'Added successfully' });
      });

    } else {
      const oldType = result[0].reaction_type;

      if (oldType === type) {
        const deleteSql = 'DELETE FROM channel_activity_likes WHERE ch_ac_id = ? AND user_id = ?';

        db.query(deleteSql, [activityid, userid], (err) => {
          if (err) return res.status(500).json(err);
          io.emit("dataChanged");
          return res.json({ message: 'Removed' });
        });

      } else {
        const updateSql = 'UPDATE channel_activity_likes SET reaction_type = ? WHERE ch_ac_id = ? AND user_id = ?';

        db.query(updateSql, [type, activityid, userid], (err) => {
          if (err) return res.status(500).json(err);
          io.emit("dataChanged");
          res.json({ message: "updated" });
        });
      }
    }
  });
};

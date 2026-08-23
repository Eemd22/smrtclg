
const db = require("../config/db");

exports.addLikes = (req, res, io) => {
  const { postid, userid, type } = req.body;

  if (!postid || !userid || !type) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (!['like', 'dislike', 'love', 'haha', 'wow', 'sad', 'angry'].includes(type)) {
    return res.status(400).json({ message: 'Invalid reaction type' });
  }

  const checkSql = 'SELECT * FROM likes WHERE post_id = ? AND user_id = ?';

  db.query(checkSql, [postid, userid], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      const insertSql = 'INSERT INTO likes (post_id, user_id, reaction_type) VALUES (?, ?, ?)';

      db.query(insertSql, [postid, userid, type], (err) => {
        if (err) return res.status(500).json(err);
        io.emit("dataChanged", { table: "likes" });
        return res.json({ message: 'Added successfully' });
      });

    } else {
      const oldType = result[0].reaction_type;

      if (oldType === type) {
        const deleteSql = 'DELETE FROM likes WHERE post_id = ? AND user_id = ?';

        db.query(deleteSql, [postid, userid], (err) => {
          if (err) return res.status(500).json(err);
          io.emit("dataChanged", { table: "likes" });
          return res.json({ message: 'Removed' });
        });

      } else {
        const updateSql = 'UPDATE likes SET reaction_type = ? WHERE post_id = ? AND user_id = ?';

        db.query(updateSql, [type, postid, userid], (err) => {
          if (err) return res.status(500).json(err);
          io.emit("dataChanged", { table: "likes" });
          res.json({ message: "updated" });
        });
      }
    }
  });
};

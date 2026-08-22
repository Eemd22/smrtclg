const db = require("../config/db");

exports.addBoardLike = (req, res, io) => {
  const { boardid, userid, type } = req.body;

  if (!boardid || !userid || !type) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (!['like', 'dislike', 'love', 'haha', 'wow', 'sad', 'angry'].includes(type)) {
    return res.status(400).json({ message: 'Invalid reaction type' });
  }

  const checkSql = 'SELECT * FROM board_likes WHERE b_id = ? AND user_id = ?';

  db.query(checkSql, [boardid, userid], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      const insertSql = 'INSERT INTO board_likes (b_id, user_id, reaction_type) VALUES (?, ?, ?)';

      db.query(insertSql, [boardid, userid, type], (err) => {
        if (err) return res.status(500).json(err);
        io.emit("dataChanged");
        return res.json({ message: 'Added successfully' });
      });

    } else {
      const oldType = result[0].reaction_type;

      if (oldType === type) {
        const deleteSql = 'DELETE FROM board_likes WHERE b_id = ? AND user_id = ?';

        db.query(deleteSql, [boardid, userid], (err) => {
          if (err) return res.status(500).json(err);
          io.emit("dataChanged");
          return res.json({ message: 'Removed' });
        });

      } else {
        const updateSql = 'UPDATE board_likes SET reaction_type = ? WHERE b_id = ? AND user_id = ?';

        db.query(updateSql, [type, boardid, userid], (err) => {
          if (err) return res.status(500).json(err);
          io.emit("dataChanged");
          res.json({ message: "updated" });
        });
      }
    }
  });
};

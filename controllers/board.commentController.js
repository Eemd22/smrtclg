const db = require("../config/db");

// ضمان وجود جدول تعليقات البورد عند إقلاع الخادم
// نحاول مع مفاتيح أجنبية، وإن فشل (اختلاف ترميز/نوع الأعمدة في القاعدة السحابية) ننشئه بدونها
const createWithFk = `
  CREATE TABLE IF NOT EXISTS board_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    b_id INT NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (b_id) REFERENCES board(b_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(uuid) ON DELETE CASCADE
  )`;
const createWithoutFk = `
  CREATE TABLE IF NOT EXISTS board_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    b_id INT NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_board_comments_b_id (b_id),
    INDEX idx_board_comments_user_id (user_id)
  )`;

db.query(createWithFk, (err) => {
  if (!err) return;
  console.error("board_comments table init (with FK) error:", err.message);
  db.query(createWithoutFk, (err2) => {
    if (err2) console.error("board_comments table init error:", err2.message);
  });
});

exports.addBoardComment = (req, res, io) => {
  const { userid, comment } = req.body;
  const bId = req.body.b_id ?? req.body.boardid;

  if (!bId || !userid || !comment) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  db.query(
    "INSERT INTO board_comments (b_id, user_id, comment) VALUES (?,?,?)",
    [bId, userid, comment],
    (err, result) => {
      if (err) return res.status(500).json(err);

      db.query(
        `SELECT board_comments.id, board_comments.b_id, board_comments.comment,
                board_comments.created_at, board_comments.user_id,
                users.username, users.profile, users.roles
         FROM board_comments
         INNER JOIN users ON board_comments.user_id = users.uuid
         WHERE board_comments.id = ?`,
        [result.insertId],
        (err2, rows) => {
          if (!err2 && io && rows && rows.length > 0) {
            io.emit("board_comment", { ...rows[0] });
          }
          res.json({ message: "added", insertId: result.insertId });
        }
      );
    }
  );
};

exports.getBoardComments = (req, res) => {
  const bId = req.params.b_id;

  const sql = `
    SELECT board_comments.id, board_comments.b_id, board_comments.comment,
           board_comments.created_at, board_comments.user_id,
           users.username, users.profile, users.roles
    FROM board_comments
    INNER JOIN users ON board_comments.user_id = users.uuid
    WHERE board_comments.b_id = ?
    ORDER BY board_comments.created_at ASC
  `;

  db.query(sql, [bId], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

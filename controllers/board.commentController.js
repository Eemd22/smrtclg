const db = require("../config/db");

// ضمان وجود جدول تعليقات البورد عند إقلاع الخادم
// 1) إنشاء الجدول إن لم يوجد
// 2) مواءمة ترتيب الأحرف (collation) مع users.uuid لتفادي اختلاط الترتيبات في الـ JOIN
// 3) إضافة المفاتيح الأجنبية كمحاولة أخيرة (تُتجاهل الأخطاء بصمت)
const createTableSql = `
  CREATE TABLE IF NOT EXISTS board_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    b_id INT NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_board_comments_b_id (b_id),
    INDEX idx_board_comments_user_id (user_id)
  )`;

const columnCollationSql = (table, column) => `
  SELECT COLLATION_NAME AS col, CHARACTER_SET_NAME AS cs
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}' AND COLUMN_NAME = '${column}'
  LIMIT 1`;

function tryForeignKeys() {
  db.query(
    `SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'board_comments'
       AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    (err, rows) => {
      if (err || !rows || !rows.length || rows[0].n > 0) return;
      db.query(
        `ALTER TABLE board_comments
           ADD CONSTRAINT fk_board_comments_board FOREIGN KEY (b_id) REFERENCES board(b_id) ON DELETE CASCADE`,
        (e1) => {
          if (e1) return console.error("board_comments FK(b_id) error:", e1.message);
          db.query(
            `ALTER TABLE board_comments
               ADD CONSTRAINT fk_board_comments_user FOREIGN KEY (user_id) REFERENCES users(uuid) ON DELETE CASCADE`,
            (e2) => {
              if (e2) console.error("board_comments FK(user_id) error:", e2.message);
            }
          );
        }
      );
    }
  );
}

function alignCollation() {
  db.query(columnCollationSql("users", "uuid"), (errU, uRows) => {
    if (errU || !uRows || !uRows.length) return tryForeignKeys();
    db.query(columnCollationSql("board_comments", "user_id"), (errB, bRows) => {
      if (errB || !bRows || !bRows.length) return tryForeignKeys();
      const usersColl = String(uRows[0].col || "").toLowerCase();
      const tableColl = String(bRows[0].col || "").toLowerCase();
      if (!usersColl || tableColl === usersColl) return tryForeignKeys();
      const usersCharset = String(uRows[0].cs || "utf8mb4");
      db.query(
        `ALTER TABLE board_comments CONVERT TO CHARACTER SET ${usersCharset} COLLATE ${usersColl}`,
        (altErr) => {
          if (altErr)
            console.error("board_comments collation align error:", altErr.message);
          tryForeignKeys();
        }
      );
    });
  });
}

db.query(createTableSql, (err) => {
  if (err) {
    console.error("board_comments table init error:", err.message);
    return;
  }
  alignCollation();
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
            // بث فوري لكل العملاء عند تغيير قاعدة البيانات
            io.emit("dataChanged", { table: "board_comments" });
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

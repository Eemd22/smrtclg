const db = require('../config/db');
exports.addComment = (req,res,io)=>{
    const {postid,userid, comment } = req.body;

   db.query(
    "INSERT INTO comments (post_id ,user_id,comment) VALUES (?,?,?)",
    [postid,userid,comment],
    (err, result) => {
      if (err) return res.status(500).json(err);

       io.emit("dataChanged", { table: "comments" });
      res.json({ message: "added" });
    }
  );
}

exports.getPostComments = (req, res) => {
  const postId = req.params.post_id;

  const sqlWithDate = `
    SELECT comments.id, comments.comment, comments.created_at,
           comments.user_id, users.username, users.profile, users.roles
    FROM comments
    INNER JOIN users ON comments.user_id = users.uuid
    WHERE comments.post_id = ?
    ORDER BY comments.created_at ASC
  `;
  const sqlWithoutDate = `
    SELECT comments.id, comments.comment,
           comments.user_id, users.username, users.profile, users.roles
    FROM comments
    INNER JOIN users ON comments.user_id = users.uuid
    WHERE comments.post_id = ?
    ORDER BY comments.id ASC
  `;

  db.query(sqlWithDate, [postId], (err, result) => {
    if (err) {
      return db.query(sqlWithoutDate, [postId], (err2, result2) => {
        if (err2) return res.status(500).json(err2);
        res.json(result2);
      });
    }
    res.json(result);
  });
}




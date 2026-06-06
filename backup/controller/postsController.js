const db = require('../config/db');

exports.getPosts = (req, res) => {
  const sql = `
    SELECT posts.*, users.name 
    FROM posts
    JOIN users ON posts.user_id = users.id
    ORDER BY posts.id DESC
  `;

  db.query(sql, (err, result) => {
    res.json(result);
  });
};

exports.addPost = (req, res, io) => {
  const { user_id, content } = req.body;

  const sql = "INSERT INTO posts (user_id, content) VALUES (?, ?)";

  db.query(sql, [user_id, content], (err, result) => {
    const newPost = {
      id: result.insertId,
      user_id,
      content
    };

    io.emit('new_post', newPost);

    res.json(newPost);
  });
};

exports.deletePost = (req, res, io) => {
  const id = req.params.id;

  db.query("DELETE FROM posts WHERE id = ?", [id], () => {
    io.emit('delete_post', id);
    res.json({ success: true });
  });
};

exports.updatePost = (req, res, io) => {
  const id = req.params.id;
  const { content } = req.body;

  db.query(
    "UPDATE posts SET content=? WHERE id=?",
    [content, id],
    () => {

      io.emit('update_post', { id, content });

      res.json({ id, content });
    }
  );
};

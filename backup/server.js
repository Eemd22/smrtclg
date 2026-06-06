const express = require('express');
const http = require('http');
const {Server}  = require('socket.io');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*"}
});

// 🗄️ MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'smart_college'
});

db.connect((err) => {
  if (err) {
    console.log('DB Error:', err);
  } else {
    console.log('MySQL Connected ');
  }
});

// 🔌 Socket
io.on('connection', (socket) => {
  console.log('User connected');

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// 📥 جلب المنشورات
app.get('/posts', (req, res) => {
  const sql = "SELECT posts.*, users.name FROM posts JOIN users ON posts.user_id = users.id ORDER BY posts.id DESC";

  db.query(sql, (err, result) => {
    if (err) return res.json(err);
    res.json(result);
  });
});

// ➕ إضافة منشور
app.post('/posts', (req, res) => {
  const { user_id, content } = req.body;

  const sql = "INSERT INTO posts (user_id, content) VALUES (?, ?)";

  db.query(sql, [user_id, content], (err, result) => {
    if (err) return res.json(err);

    const newPost = {
      id: result.insertId,
      user_id,
      content
    };

    io.emit('new_post', newPost);

    res.json(newPost);
  });
});

// ❌ حذف منشور
app.delete('/posts/:id', (req, res) => {
  const id = req.params.id;

  db.query("DELETE FROM posts WHERE id = ?", [id], (err) => {
    if (err) return res.json(err);

    io.emit('delete_post', id);

    res.json({ success: true });
  });
});

// ✏️ تعديل منشور
app.put('/posts/:id', (req, res) => {
  const id = req.params.id;
  const { content } = req.body;

  db.query(
    "UPDATE posts SET content=? WHERE id=?",
    [content, id],
    (err) => {
      if (err) return res.json(err);

      io.emit('update_post', { id, content });

      res.json({ id, content });
    }
  );
});

// 🚀 تشغيل السيرفر
server.listen(3000, () => {
  console.log('Server running on port 3000 ');
});

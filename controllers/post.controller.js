const db = require("../config/db");
const {v4: uuid} = require('uuid');
const id = uuid();
// *********************** دالة جلب المنشورات *****************************
exports.getAllPosts = (req, res) => {
    const sql = `
        SELECT p.id,
    p.content,
    p.created_at,
     p.user_id ,
    p.image,
    u.username,
    u.profile,
    u.roles,
   

    COALESCE(c.comments_count, 0) AS comments_count,
    COALESCE(l.likes_count, 0) AS likes_count,
    COALESCE(l.dislikes_count, 0) AS dislikes_count
    
FROM posts p 
LEFT JOIN users u ON u.uuid = p.user_id 
LEFT JOIN (
    SELECT post_id, COUNT(*) AS comments_count
    FROM comments
    GROUP BY post_id  
) c ON c.post_id = p.id  
LEFT JOIN (
    SELECT 
        post_id,
        COUNT(CASE WHEN reaction_type = 'Like' THEN 1 END) AS likes_count,
        COUNT(CASE WHEN reaction_type = 'Dislike' THEN 1 END) AS dislikes_count
    FROM likes
    GROUP BY post_id 
) l ON l.post_id = p.id
ORDER BY p.created_at DESC;
    `;
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json(err);
          
        res.json(result);
    });
}

// ******************************* دالة جلب المنشورات بواسطة معرف المستخدم *******************
exports.getAllPostsById = (req, res) => {
  const uid = req.params.uid;
  const sql = `
    SELECT 
      users.uuid AS user_id,
         users.username,
         users.profile,
         users.roles,
      posts.image,
      posts.created_at,
      posts.id AS post_id,
      posts.content,
      COUNT(DISTINCT comments.id) AS comments_count,
      COUNT(DISTINCT likes.id) AS likes_count
    FROM users
    LEFT JOIN posts ON users.uuid = posts.user_id
    LEFT JOIN comments ON posts.id = comments.post_id
    LEFT JOIN likes ON posts.id = likes.post_id
    WHERE users.uuid = ?
    GROUP BY posts.id ORDER BY posts.created_at DESC
  `;
    db.query(sql,[uid], (err, result) => {
        if (err) return res.status(500).json(err);

        res.json(result);
    });
}

// fetchPostsDataById
// **************************** دالة اضافة منشور جديد *********************
exports.addPost = (req, res, io) => {
    const { content, user_id } = req.body;
    const image = req.file ? `posts/uploads/${req.file.filename}` : null;
    const sql = "INSERT INTO posts (user_id, content, image) VALUES (?, ?, ?)";
    db.query(sql, [user_id, content, image], (err, result) => {
        if (err) return res.status(500).send(err);
        io.emit("dataChanged");
        res.json({ "message": "added" });
    });
}

// ********************** دالة حذف المنشور ************************

exports.deletePost =  (req, res,io) => {
  const id = req.params.id;
const {userid} = req.body;
  db.query(
    "DELETE FROM posts WHERE id=? AND user_id=?",
    [id,userid],
    (err, result) => {
      if (err) return res.status(500).json(err);

      io.emit("dataChanged");
      res.json({ "message": "deleted" });
    }
  );
};

// ************************** دالة تعديل المنشور ****************************

exports.editPost =  (req, res,io) => {
  const postid = req.params.postid;
 
  const {content,userid } = req.body;

  db.query(
    "UPDATE posts SET content=? WHERE id=? AND user_id=?",
    [content,postid,userid],
    (err, result) => {
      if (err) return res.status(500).json(err);

      io.emit("dataChanged");
      
      res.json({ message: "updated" });
    }
  );
};


/*

`
                       SELECT 
  u.uuid AS user_id,
         u.username,
         u.profile,
         u.roles,
         p.image,
         p.created_at,
         p.id AS post_id,
         p.content,

  COALESCE(l.likes, 0) AS likes,
  COALESCE(d.dislikes, 0) AS dislikes,
  COALESCE(c.comment_count, 0) AS comment_count

FROM posts p

LEFT JOIN users u ON u.uuid = p.user_id

-- likes
LEFT JOIN (
  SELECT post_id, COUNT(*) AS likes
  FROM likes
  WHERE reaction_type = 'like'
  GROUP BY post_id
) l ON l.post_id = p.id

-- dislikes
LEFT JOIN (
  SELECT post_id, COUNT(*) AS dislikes
  FROM likes
  WHERE reaction_type = 'dislike'
  GROUP BY post_id
) d ON d.post_id = p.id
LEFT JOIN (
  SELECT post_id, COUNT(*) AS comment_count
  FROM comments
  GROUP BY post_id
) c ON c.post_id = p.id

    
        GROUP BY p.id
        ORDER BY p.created_at DESC
    `
*/ 




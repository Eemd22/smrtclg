const db = require("../config/db");
const { resolveUploadPath } = require("../services/db-storage.service");
// *********************** دالة جلب المنشورات *****************************
exports.getAllPosts = (req, res) => {
    const userId = req.query.user_id || null;
    const sql = `
        SELECT p.id,
    p.content,
    p.created_at,
    p.user_id,
    p.image,
    u.username,
    u.profile,
    u.roles,
    COALESCE(c.comments_count, 0) AS comments_count,
    COALESCE(l.likes_count, 0) AS likes_count,
    COALESCE(l.dislikes_count, 0) AS dislikes_count,
    COALESCE(l.love_count, 0) AS love_count,
    COALESCE(l.haha_count, 0) AS haha_count,
    COALESCE(l.wow_count, 0) AS wow_count,
    COALESCE(l.sad_count, 0) AS sad_count,
    COALESCE(l.angry_count, 0) AS angry_count,
    (
        SELECT reaction_type FROM likes
        WHERE post_id = p.id AND user_id = ?
        LIMIT 1
    ) AS user_reaction
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
        COUNT(CASE WHEN reaction_type = 'like' THEN 1 END) AS likes_count,
        COUNT(CASE WHEN reaction_type = 'dislike' THEN 1 END) AS dislikes_count,
        COUNT(CASE WHEN reaction_type = 'love' THEN 1 END) AS love_count,
        COUNT(CASE WHEN reaction_type = 'haha' THEN 1 END) AS haha_count,
        COUNT(CASE WHEN reaction_type = 'wow' THEN 1 END) AS wow_count,
        COUNT(CASE WHEN reaction_type = 'sad' THEN 1 END) AS sad_count,
        COUNT(CASE WHEN reaction_type = 'angry' THEN 1 END) AS angry_count
    FROM likes
    GROUP BY post_id
) l ON l.post_id = p.id
ORDER BY p.created_at DESC;
    `;
    db.query(sql, [userId], (err, result) => {
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
exports.addPost = async (req, res, io) => {
    const { content, user_id } = req.body;
    const image = await resolveUploadPath(req);
    const sql = "INSERT INTO posts (user_id, content, image) VALUES (?, ?, ?)";
    db.query(sql, [user_id, content, image], (err, result) => {
        if (err) return res.status(500).send(err);
        io.emit("dataChanged", { table: "posts" });
        res.json({ "message": "added" });
    });
}

// ********************** دالة حذف المنشور ************************

exports.deletePost =  (req, res,io) => {
  const id = req.params.id;
  db.query(
    "DELETE FROM posts WHERE id=?",
    [id],
    (err, result) => {
      if (err) return res.status(500).json(err);

      io.emit("dataChanged", { table: "posts" });
      res.json({ "message": "deleted" });
    }
  );
};

// ************************** دالة تعديل المنشور ****************************

exports.editPost =  (req, res,io) => {
  const postid = req.params.postid;
  
  const {content} = req.body;

  db.query(
    "UPDATE posts SET content=? WHERE id=?",
    [content,postid],
    (err, result) => {
      if (err) return res.status(500).json(err);

      io.emit("dataChanged", { table: "posts" });
      
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




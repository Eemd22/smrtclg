
 const db = require("../config/db");
// 🚀 API
exports.GetStatistic =  async(req, res) => {



    const query = `
        WITH 
          
 GeneralStats AS (
        SELECT 
            (SELECT COUNT(*) FROM users) AS total_users,
            (SELECT COUNT(*) FROM posts) AS total_posts
    ),
    MostActiveUser AS (
        SELECT 
            u.username AS top_user_name, 
            COUNT(p.id) AS top_user_post_count
        FROM users u
        LEFT JOIN posts p ON u.uuid = p.user_id
        GROUP BY u.uuid, u.username
        ORDER BY top_user_post_count DESC
        LIMIT 1
    ),
    MostEngagedPost AS (
        SELECT 
            p.content AS top_post_title,
            u.username AS top_post_author, -- هنا أضفنا اسم صاحب المنشور
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS top_post_comments,
            (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS top_post_alllikes,
             (SELECT COUNT(*) FROM likes l WHERE l.reaction_type= "like" AND l.post_id = p.id) AS top_post_li,
            (SELECT COUNT(*) FROM  likes l WHERE  l.reaction_type= "dislike" AND  l.post_id = p.id) AS top_post_dli,
             (SELECT SUM(reaction_type='like') FROM likes l WHERE l.post_id = p.id) AS top_post_likes,
            (SELECT SUM(reaction_type='dislike') FROM likes l WHERE l.post_id = p.id) AS top_post_dislikes
        FROM posts p
        JOIN users u ON p.user_id = u.uuid -- ربط جدول المنشورات بالمستخدمين
        ORDER BY (top_post_comments + top_post_likes) DESC
        LIMIT 1
    )
SELECT * FROM GeneralStats 
CROSS JOIN MostActiveUser 
CROSS JOIN MostEngagedPost;
    `;

      db.query(query, (err, result) => {
    if (err) return res.status(500).json(err);
res.json(result);
//  io.emit("dataChanged");

     console.log(result);

  });

  
};



// 10.183.107.90





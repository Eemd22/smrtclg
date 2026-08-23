

const db = require("../config/db");
const { resolveUploadPath } = require("../services/cloudinary.service");

exports.getBoard = (req, res,io) => {
    const userId = req.query.user_id || null;
    const sql = `
        SELECT board.*,
        users.username,
        users.profile,
        users.roles,
        COALESCE(bl.likes_count, 0) AS likes_count,
        COALESCE(bl.dislikes_count, 0) AS dislikes_count,
        COALESCE(bl.love_count, 0) AS love_count,
        COALESCE(bl.haha_count, 0) AS haha_count,
        COALESCE(bl.wow_count, 0) AS wow_count,
        COALESCE(bl.sad_count, 0) AS sad_count,
        COALESCE(bl.angry_count, 0) AS angry_count,
        (
            SELECT COUNT(*) FROM board_comments
            WHERE b_id = board.b_id
        ) AS comments_count,
        (
            SELECT reaction_type FROM board_likes
            WHERE b_id = board.b_id AND user_id = ?
            LIMIT 1
        ) AS user_reaction
        FROM board
        JOIN users ON board.user_id = users.uuid
        LEFT JOIN (
            SELECT 
                b_id,
                COUNT(CASE WHEN reaction_type = 'like' THEN 1 END) AS likes_count,
                COUNT(CASE WHEN reaction_type = 'dislike' THEN 1 END) AS dislikes_count,
                COUNT(CASE WHEN reaction_type = 'love' THEN 1 END) AS love_count,
                COUNT(CASE WHEN reaction_type = 'haha' THEN 1 END) AS haha_count,
                COUNT(CASE WHEN reaction_type = 'wow' THEN 1 END) AS wow_count,
                COUNT(CASE WHEN reaction_type = 'sad' THEN 1 END) AS sad_count,
                COUNT(CASE WHEN reaction_type = 'angry' THEN 1 END) AS angry_count
            FROM board_likes
            GROUP BY b_id
        ) bl ON bl.b_id = board.b_id
        ORDER BY board.created_at DESC `;
    db.query(sql, [userId], (err, result) => {
        if (err) return res.status(500).json(err);
        io.emit("dataBoard"); 
        res.json(result);
    });

}




exports.addBoard = async (req, res, io) => {
    const { content, user_id } = req.body;
    const image = await resolveUploadPath(req, "boards");
   
    const sql = "INSERT INTO board ( content,user_id, image) VALUES (?, ?, ?)";
    db.query(sql, [ content,user_id, image], (err, result) => {
        if (err) return res.status(500).send(err);
        console.log(result);
    
        res.json({ message: "added" });
          io.emit("dataChanged", { table: "board" }); 
    
    }
)}




exports.deleteBoard =  (req, res,io) => {
  const id = req.params.b_id;
  db.query(
    "DELETE FROM board WHERE b_id=?",
    [id],
    (err, result) => {
      if (err) return res.status(500).json(err);

      io.emit("dataChanged", { table: "board" });

      res.json({ "message": "deleted" });

    }
  );
};




// code edit table board by user_id and b_id
exports.editBoard =  (req, res,io) => {
  const b_id = req.params.b_id;
  
  const {content} = req.body;

  db.query(
    "UPDATE board SET content=? WHERE b_id=?",
    [content,b_id],
    (err, result) => {
      if (err) return res.status(500).json(err);

      io.emit("dataChanged", { table: "board" });
      
      res.json({ message: "updated" });
    }
  );
};


// end code edit table board by user_id and b_id
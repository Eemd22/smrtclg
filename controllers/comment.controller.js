const db = require('../config/db');
exports.addComment = (req,res,io)=>{
    const {postid,userid, comment } = req.body;

  db.query(
    "INSERT INTO comments (post_id ,user_id,comment) VALUES (?,?,?)",
    [postid,userid,comment],
    (err, result) => {
      if (err) return res.status(500).json(err);

       io.emit("dataChanged"); 
      res.json({ message: "added" });
    }
  );  
}




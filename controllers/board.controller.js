

const db = require("../config/db");

exports.getBoard = (req, res,io) => {
    const sql = `
        SELECT *
        FROM board
        JOIN users ON board.user_id = users.uuid
        
        ORDER BY board.created_at DESC `;
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json(err);
        io.emit("dataBoard"); 
        res.json(result);
    });

}




exports.addBoard= (req, res, io) => {
    const { content, user_id } = req.body;
    const image = req.file ? `boards/uploads/${req.file.filename}` : null;
   
    const sql = "INSERT INTO board ( content,user_id, image) VALUES (?, ?, ?)";
    db.query(sql, [ content,user_id, image], (err, result) => {
        if (err) return res.status(500).send(err);
        console.log(result);
    
        res.json({ message: "added" });
          io.emit("dataChanged"); 
    
    }
)}




exports.deleteBoard =  (req, res,io) => {
  const id = req.params.b_id;
const {userid} = req.body;
  db.query(
    "DELETE FROM board WHERE b_id=? AND user_id=?",
    [id,userid],
    (err, result) => {
      if (err) return res.status(500).json(err);

      io.emit("dataChanged");

      res.json({ "message": "deleted" });

    }
  );
};




// code edit table board by user_id and b_id
exports.editBoard =  (req, res,io) => {
  const b_id = req.params.b_id;
 
  const {content,userid } = req.body;

  db.query(
    "UPDATE board SET content=? WHERE b_id=? AND user_id=?",
    [content,b_id,userid],
    (err, result) => {
      if (err) return res.status(500).json(err);

      io.emit("dataChanged");
      
      res.json({ message: "updated" });
    }
  );
};


// end code edit table board by user_id and b_id

const db = require("../config/db");
// ***************** دالة اضافة اعجاب *********************
// exports.addLikes =  (req, res,io) => {
//   const {postid,userid } = req.body;
//   db.query(
//     "INSERT INTO likes (post_id,user_id) VALUES (?,?)",
//     [postid,userid],
//     (err, result) => {
//       if (err) return res.status(500).json(err);
//       io.emit("dataChanged"); // تحديث مباشر
//       res.json({ message: "added" });
//     }
//   );
// }





//  exports.addLikes = (req, res,io) => {
 
//     const { userid, postid, type } = req.body;
//  console.log(userid);
//     try {
//         // التحقق من وجود تفاعل سابق
//         const checkSql =  db.query(
//             'SELECT * FROM likes WHERE post_id  = ? AND user_id = ?',
//             [ postid,userid]
//         );

//         if (existing.length > 0) {
//             if (existing[0].reaction_type === type) {
//                 // إذا كان نفس النوع، قم بإلغائه (Delete)
//                  db.query('DELETE FROM likes WHERE id = ?', [existing[0].id]);
//                 return res.json({ status: 'removed' });
//             } else {
//                 // إذا كان نوعاً مختلفاً، قم بتحديثه (Update)
//                  db.query('UPDATE likes SET reaction_type = ? WHERE id = ?', [type, existing[0].id]);
//                 return res.json({ status: 'updated' });
//             }
//         } else {
//             // إضافة تفاعل جديد
//              db.query('INSERT INTO likes (post_id,user_id, reaction_type) VALUES (?, ?, ?)', 
//             [postid,userid, type]);
//            io.emit("dataChanged"); // تحديث مباشر
//       res.json({ message: "added" });
//         }
//     } catch (err) {
//         res.status(500).send(err.message);
//     }
// }





exports.addLikes= (req, res,io) => {
  const { postid,userid , type } = req.body;

  // تحقق هل المستخدم عمل تفاعل قبل كده
  const checkSql = 'SELECT * FROM likes WHERE post_id = ? AND  user_id = ?';

  db.query(checkSql, [ postid,userid], (err, result) => {
    if (err) return res.json(err);
   console.log("select");
    // إذا لم يوجد تفاعل
    if (result.length === 0) {

      const insertSql = 'INSERT INTO likes ( post_id,user_id, reaction_type) VALUES (?, ?, ?)';

      db.query(insertSql, [ postid,userid, type], (err, data) => {
        if (err) return res.json(err);

        return res.json({ message: 'Added successfully' });
      });

    } else {
      // يوجد تفاعل مسبق

      const oldType = result[0].reaction_type;

      // إذا ضغط نفس الزر → حذف (unlike)
      if (oldType === type) {

        const deleteSql = 'DELETE FROM likes WHERE post_id =? AND user_id=?';

        db.query(deleteSql, [ postid,userid], (err) => {
          if (err) return res.json(err);

          return res.json({ message: 'Removed' });
        });

      } else {
        // تغيير من like إلى dislike أو العكس
        const updateSql = 'UPDATE likes SET reaction_type=? WHERE post_id=? AND user_id=?';

        db.query(updateSql, [type,postid,userid], (err) => {
          if (err) return res.json(err);
          console.log("yes");
              io.emit("dataChanged"); // تحديث مباشر
      res.json({ message: "added" });
        });
      }
    }
  });
}







 



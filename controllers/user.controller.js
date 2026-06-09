const db = require("../config/db");
const {v4: uuid} = require('uuid');
const uid = uuid();
const uuuid = "userID:"+uid;

// دالة تسجيل الدخول
exports.login = (req, res) => {
    const { email, password } = req.body;
    db.query("SELECT * FROM users WHERE email=? AND password=?", [email, password], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
        
    });
};
// دالة جلب مستخدم بواسطة المعرف
exports.getUserBiId = (req, res) => {
   const id = req.params.userid;
   
    db.query(` SELECT posts.id, users.uuid ,users.username,users.profile,
	COUNT(posts.id) AS posts_count
        FROM posts
        LEFT JOIN users  ON posts.user_id =  users.uuid 
        WHERE users.uuid =?;
    `,
         [id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
};

// ################# جلب كل المستخدمين #####################
exports.getAllUser = (req, res) => {
   const id = req.params.userid;
   
    db.query(` SELECT * FROM  users
    `,
         [id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
};

exports.getAllUserBYId = (req, res) => {
   const id = req.params.userid;
   
    db.query(`  SELECT *,
	COUNT(posts.id) AS posts_count
        FROM posts
        LEFT JOIN users  ON posts.user_id =  users.uuid 
        WHERE users.uuid = ?
    `,
         [id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
};

//get_allusers

	


	


// دالة اضافة مستخدم جديد
exports.addUser = (req, res, io) => {
	
    const { username, email, password } = req.body;
    const sql = "INSERT INTO users (2,username, email, password) VALUES (?,?, ?, ?)";
    db.query(sql, [uuuid,username, email, password], (err, result) => {
        if (err) return res.status(500).json(err);
        io.emit("dataChanged");
        res.json({ message: "added" });
    });
};
// دالة حذف مستخدم
exports.deleteUser = (req, res, io) => {
    const { id } = req.params;
    db.query("DELETE FROM users WHERE id=?", [id], (err, result) => {
        if (err) return res.status(500).json(err);
        io.emit("dataChanged");
        res.json({ message: "deleted" });
    });
};


// edit profile user
// دالة تعديل صورة البروفايل
exports.editProfile = (req, res, io) => {
const userid = req.params.userid;
const profile = req.file ? `users/uploads/${req.file.filename}` : null;
    
    db.query("UPDATE users SET profile=? WHERE uuid=? ", [ profile,userid], (err, result) => {
        if (err) return res.status(500).send(err);
         io.emit("dataChanged");
        console.log("etryuiopertyugijoersdtyguh",userid);
        res.json({ message: "added" });
    });
};



exports.editRoleUser =  (req, res) => {

 
  const {role,userid } = req.body;
   console.log(role);
   console.log(userid);
  db.query(
    "UPDATE users SET roles=? WHERE uuid=?",
    [role,userid],
    (err, result) => {
      if (err) return res.status(500).json(err);

    
      
      res.json({ message: "updated" });
    }
  );
};
// change_allusers


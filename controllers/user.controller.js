
const db = require("../config/db");
const {v4: uuid} = require('uuid');
const bcrypt = require("bcryptjs");
const { signToken } = require("../middleware/auth");


// دالة تسجيل الدخول
exports.login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    db.query(`
        SELECT users.*, 
            (SELECT COUNT(*) FROM followers WHERE following_id = users.uuid) AS followers_count,
            (SELECT COUNT(*) FROM followers WHERE follower_id = users.uuid) AS following_count
        FROM users 
        WHERE email=?
    `, [email], async (err, result) => {
        if (err) return res.status(500).json(err);
        if (!result || result.length === 0) return res.json([]);
        const user = result[0];
        let ok = false;
        let isPlaintextMatch = false;
        try { ok = await bcrypt.compare(password, user.password); } catch (_) {}
        // دعم الحسابات القديمة (نص صريح) وبيانات الأجهزة المحفوظة أثناء الانتقال
        if (!ok && user.password === password) { ok = true; isPlaintextMatch = true; }
        if (!ok) return res.json([]);
        // ترقية تلقائية: تحويل كلمة المرور القديمة النصية إلى hash
        if (isPlaintextMatch && typeof user.password === "string" && !user.password.startsWith("$2")) {
            db.query("UPDATE users SET password=? WHERE uuid=?", [await bcrypt.hash(user.password, 10), user.uuid], () => {});
        }
        result[0].token = signToken(user);
        res.json(result);
    });
};
// دالة جلب مستخدم بواسطة المعرف
exports.getUserBiId = (req, res) => {
   
	

	const id = req.params.userid;
   
   db.query(`
    SELECT users.*, 
        COUNT(DISTINCT posts.id) AS posts_count,
        (SELECT COUNT(*) FROM followers WHERE following_id = users.uuid) AS followers_count,
        (SELECT COUNT(*) FROM followers WHERE follower_id = users.uuid) AS following_count,
        (SELECT COUNT(*) FROM likes l JOIN posts p ON l.post_id = p.id WHERE p.user_id = users.uuid AND l.reaction_type = 'like') AS likes_count
    FROM users
    LEFT JOIN posts ON users.uuid = posts.user_id
    WHERE users.uuid = ?
    GROUP BY users.uuid
`, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
});
};

// ################# جلب كل المستخدمين #####################
exports.getAllUser = (req, res) => {
    db.query(` SELECT * FROM users`, (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
};

exports.getAllUserBYId = (req, res) => {
   const id = req.params.userid;
   
   db.query(`
    SELECT users.*, 
        COUNT(DISTINCT posts.id) AS posts_count,
        (SELECT COUNT(*) FROM followers WHERE following_id = users.uuid) AS followers_count,
        (SELECT COUNT(*) FROM followers WHERE follower_id = users.uuid) AS following_count
    FROM users
    LEFT JOIN posts ON users.uuid = posts.user_id
    WHERE users.uuid = ?
    GROUP BY users.uuid
`, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
});
};

//get_allusers

	


	


// دالة اضافة مستخدم جديد
exports.addUser = (req, res, io) => {
    const uid = uuid();
    const uuuid = "userID:" + uid;
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const sql = "INSERT INTO users (uuid, username, email, password) VALUES (?, ?, ?, ?)";
    db.query(sql, [uuuid, username, email, bcrypt.hashSync(password, 10)], (err, result) => {
        if (err) return res.status(500).json(err);
        io.emit("dataChanged");
        res.json({ message: "added", "uuid": uuuid });
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
    
    db.query("UPDATE users SET profile=? WHERE uuid=?", [profile, userid], (err, result) => {
        if (err) return res.status(500).send(err);
        io.emit("dataChanged");
        res.json({ message: "updated", profile: profile });
    });
};

// دالة تعديل بيانات المستخدم (الاسم والبريد)
exports.updateUserData = (req, res, io) => {
    const userid = req.params.userid;
    const { username, email } = req.body;

    if (!username || !email) {
        return res.status(400).json({ message: 'Username and email are required' });
    }

    db.query("UPDATE users SET username=?, email=? WHERE uuid=?", [username, email, userid], (err, result) => {
        if (err) return res.status(500).json(err);
        io.emit("dataChanged");
        res.json({ message: "updated" });
    });
};

// دالة استعادة كلمة المرور (نسيت كلمة المرور)
exports.forgotPassword = async (req, res, io) => {
    const { email, username, newPassword } = req.body;

    if (!email || !username || !newPassword) {
        return res.status(400).json({ message: 'Email, username and new password are required' });
    }

    db.query("SELECT uuid FROM users WHERE email=? AND username=?", [email, username], async (err, result) => {
        if (err) return res.status(500).json(err);
        if (!result || result.length === 0) {
            return res.status(404).json({ message: 'البريد الإلكتروني أو اسم المستخدم غير صحيح' });
        }
        db.query("UPDATE users SET password=? WHERE uuid=?", [await bcrypt.hash(newPassword, 10), result[0].uuid], (err2) => {
            if (err2) return res.status(500).json(err2);
            io.emit("dataChanged");
            res.json({ message: "password updated" });
        });
    });
};

// دالة تغيير كلمة المرور
exports.changePassword = async (req, res) => {
    const userid = req.params.userid;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Old and new passwords are required' });
    }

    db.query("SELECT password FROM users WHERE uuid=?", [userid], async (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        const stored = result[0].password;
        let ok = false;
        try { ok = await bcrypt.compare(oldPassword, stored); } catch (_) {}
        if (!ok && stored === oldPassword) ok = true; // دعم الحسابات القديمة أثناء الانتقال
        if (!ok) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
        db.query("UPDATE users SET password=? WHERE uuid=?", [await bcrypt.hash(newPassword, 10), userid], (err2, result2) => {
            if (err2) return res.status(500).json(err2);
            res.json({ message: "password updated" });
        });
    });
};



const VALID_ROLES = ["طالب", "محاضر", "مشرف"];

exports.editRoleUser = (req, res, io) => {
  const { role, userid } = req.body;

  if (!role || !userid || !VALID_ROLES.includes(role)) {
    return res.status(400).json({ message: "قيمة الصلاحية غير صالحة" });
  }

  db.query(
    "UPDATE users SET roles=? WHERE uuid=?",
    [role, userid],
    (err, result) => {
      if (err) return res.status(500).json(err);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      io.emit("dataChanged");
      res.json({ message: "updated" });
    }
  );
};
// change_allusers

// دالة تعديل صورة الخلفية
exports.editCoverImage = (req, res, io) => {
    const userid = req.params.userid;
    const cover_image = req.file ? `users/uploads/${req.file.filename}` : null;

    db.query("UPDATE users SET cover_image=? WHERE uuid=?", [cover_image, userid], (err, result) => {
        if (err) return res.status(500).send(err);
        io.emit("dataChanged");
        res.json({ message: "updated", cover_image: cover_image });
    });
};


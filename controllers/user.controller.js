
const db = require("../config/db");
const {v4: uuid} = require('uuid');
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const { signToken } = require("../middleware/auth");

const stripPassword = (rows) => {
    if (Array.isArray(rows)) rows.forEach((r) => delete r.password);
    return rows;
};

const UPLOAD_DIRS = ["users/uploads", "posts/uploads", "boards/uploads", "departments/uploads", "alboum/uploads", "channel/uploads", "channelActivity/uploads", "lecture/uploads"]
    .map((d) => path.join(__dirname, "..", d) + path.sep);

const removeUploadFile = (relPath) => {
    try {
        const full = path.join(__dirname, "..", path.normalize(relPath));
        if (!UPLOAD_DIRS.some((d) => full.startsWith(d))) return;
        fs.unlink(full, () => {});
    } catch (_) {}
};


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
        res.json(stripPassword(result));
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
    res.json(stripPassword(result));
});
};

// ################# جلب كل المستخدمين #####################
exports.getAllUser = (req, res) => {
    db.query(` SELECT * FROM users`, (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(stripPassword(result));
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
    res.json(stripPassword(result));
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
        io.emit("dataChanged", { table: "users" });
        res.json({ message: "added", "uuid": uuuid });
    });
};








// حذف إجباري لبيانات كل الجداول المرتبطة بالمستخدم قبل حذف سجل المستخدم نفسه
// الترتيب مهم: الأبناء أولاً ثم الآباء لتفادي تعارض المفاتيح الأجنبية
const USER_FORCED_DELETES = [
    // تفاعلات وتعليقات منشورات المستخدم (بما فيها تفاعلات الآخرين على منشوراته)
    { sql: "DELETE FROM likes WHERE user_id=? OR post_id IN (SELECT id FROM posts WHERE user_id=?)" },
    { sql: "DELETE FROM comments WHERE user_id=? OR post_id IN (SELECT id FROM posts WHERE user_id=?)" },
    { sql: "DELETE FROM posts WHERE user_id=?" },
    // البورد وتفاعلاته وتعليقاته
    { sql: "DELETE FROM board_likes WHERE user_id=? OR b_id IN (SELECT b_id FROM board WHERE user_id=?)" },
    { sql: "DELETE FROM board_comments WHERE user_id=? OR b_id IN (SELECT b_id FROM board WHERE user_id=?)" },
    { sql: "DELETE FROM board WHERE user_id=?" },
    // الأنشطة وتفاعلاتها وتعليقاتها
    { sql: "DELETE FROM activity_likes WHERE user_id=?" },
    { sql: "DELETE FROM activity_comments WHERE user_id=?" },
    { sql: "DELETE FROM activites WHERE user_id=?" },
    // المجتمعات ومحتوياتها وتفاعلاتها (بما فيها محتوى الآخرين داخل مجتمع المستخدم)
    { sql: "DELETE FROM channel_activity_likes WHERE user_id=? OR ch_ac_id IN (SELECT ch_ac_id FROM channel_activity WHERE ch_ac_auther=? OR ch_id IN (SELECT ch_id FROM channels WHERE user_id=?))" },
    { sql: "DELETE FROM channel_activity WHERE ch_ac_auther=? OR ch_id IN (SELECT ch_id FROM channels WHERE user_id=?)" },
    { sql: "DELETE FROM channels WHERE user_id=?" },
    // الألبومات والمتابعات
    { sql: "DELETE FROM albums WHERE user_id=?" },
    { sql: "DELETE FROM followers WHERE follower_id=? OR following_id=?" },
];

// دالة حذف مستخدم
// تحذف ملفات المستخدم ومحتوياته من القرص ثم تحذف بياناته من جميع الجداول المرتبطة إجبارياً ثم تحذف السجل
exports.deleteUser = (req, res, io) => {
    const id = req.params.id;
    const fileQueries = [
        "SELECT profile AS f FROM users WHERE uuid=? AND profile IS NOT NULL",
        "SELECT cover_image AS f FROM users WHERE uuid=? AND cover_image IS NOT NULL",
        "SELECT image AS f FROM posts WHERE user_id=? AND image IS NOT NULL",
        "SELECT image AS f FROM board WHERE user_id=? AND image IS NOT NULL",
        "SELECT image AS f FROM activites WHERE user_id=? AND image IS NOT NULL",
        "SELECT channel_image AS f FROM channels WHERE user_id=?",
        "SELECT ch_ac_image AS f FROM channel_activity WHERE ch_ac_auther=?",
        "SELECT image AS f FROM albums WHERE user_id=?",
    ];
    let files = [];
    let pending = fileQueries.length;
    const runForcedDeletes = (i, done) => {
        if (i >= USER_FORCED_DELETES.length) return done();
        const { sql } = USER_FORCED_DELETES[i];
        const params = Array((sql.match(/\?/g) || []).length).fill(id);
        db.query(sql, params, (e) => {
            if (e) console.error("حذف بيانات المستخدم من جدول مرتبط فشل:", e.message);
            runForcedDeletes(i + 1, done);
        });
    };
    fileQueries.forEach((q) => {
        db.query(q, [id], (err, rows) => {
            if (!err && Array.isArray(rows)) files = files.concat(rows.map((r) => r.f).filter(Boolean));
            if (--pending === 0) {
                files.forEach(removeUploadFile);
                runForcedDeletes(0, () => {
                    db.query("DELETE FROM users WHERE uuid=?", [id], (err2, result) => {
                        if (err2) return res.status(500).json(err2);
                        if (!result || result.affectedRows === 0) {
                            return res.status(404).json({ message: "المستخدم غير موجود" });
                        }
                        io.emit("dataChanged", { table: "users" });
                        res.json({ message: "deleted" });
                    });
                });
            }
        });
    });
};


// edit profile user
// دالة تعديل صورة البروفايل
exports.editProfile = (req, res, io) => {
    const userid = req.params.userid;
    const profile = req.file ? `users/uploads/${req.file.filename}` : null;
    
    db.query("UPDATE users SET profile=? WHERE uuid=?", [profile, userid], (err, result) => {
        if (err) return res.status(500).send(err);
        io.emit("dataChanged", { table: "users" });
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
        io.emit("dataChanged", { table: "users" });
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
            io.emit("dataChanged", { table: "users" });
            res.json({ message: "password updated" });
        });
    });
};

// دالة تغيير كلمة المرور
exports.changePassword = async (req, res, io) => {
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
            io.emit("dataChanged", { table: "users" });
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
      io.emit("dataChanged", { table: "users" });
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
        io.emit("dataChanged", { table: "users" });
        res.json({ message: "updated", cover_image: cover_image });
    });
};


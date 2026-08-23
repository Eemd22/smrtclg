const db = require("../config/db");
const { isConfigured, uploadImage } = require("../services/cloudinary.service");

// يعيد رابط الصورة: سحابي إن توفرت مفاتيح Cloudinary، وإلا مسار محلي
async function resolveImagePath(req) {
    if (req.file && req.file.buffer && isConfigured()) {
        return uploadImage(req.file);
    }
    return null;
}


exports.getChannel = (req, res,io) => {
   const id = req.params.userid;
   
    db.query(` SELECT users.username,users.profile,users.roles,channels.ch_id,
        channels.user_id, channels.channel_image,
        channels.channel_name FROM users INNER JOIN  channels ON  users.uuid= channels.user_id
        
    `,
         [id], (err, result) => {
        if (err) return res.status(500).json(err);
         
        res.json(result);
        console.log(result);
      
    });
}




exports.addChannel = async (req, res, io) => {
  
    const { channel_name} = req.body;
    // الهوية تُشتق من التوكن بعد التحقق من الدور (مشرف/محاضر) وليس من body
    const userid = req.user ? req.user.uuid : req.body.userid;
    let image = null;
    try {
        image = req.file ? (await resolveImagePath(req)) ?? `channel/uploads/${req.file.filename}` : null;
    } catch (e) {
        return res.status(500).json({ error: "image upload failed", detail: e.message });
    }

    
    const sql = 'INSERT INTO channels (channel_name,channel_image,user_id) VALUES (?,?,?)';
   db.query(sql, [channel_name, image,userid], (err, result) => {
        if (err) return res.status(500).json(err);
        io.emit("dataChanged", { table: "channels" });

        res.json({ message: "added" });
    });
}


// ############## مسار اضافة محتوي في المجتمع ##################

exports.addChannelActivity = async (req, res,io) => {
    const {ch_id, content} = req.body || {};
    // الهوية تُشتق من التوكن إن وُجد وإلا من الحقول المرسلة
    const auther_id = req.user ? req.user.uuid : (req.body || {}).auther_id;

    // تحقق من المدخلات قبل الادخال لتجنب انهيار المفتاح الأجنبي بخطأ 500 خام
    if (!ch_id || !auther_id || auther_id === "null" || auther_id === "") {
        return res.status(400).json({ error: "بيانات ناقصة", detail: "ch_id و auther_id مطلوبان - قد تكون الجلسة منتهية، أعد تسجيل الدخول" });
    }

    let image = null;
    try {
        image = req.file ? (await resolveImagePath(req)) ?? `channelActivity/uploads/${req.file.filename}` : null;
    } catch (e) {
        return res.status(500).json({ error: "image upload failed", detail: e.message });
    }

const _sql ='INSERT INTO channel_activity (ch_ac_image,ch_ac_auther,ch_id,ch_ac_content) VALUES (?,?,?,?)';
   db.query(_sql, 
    [image, auther_id,ch_id,content], 
     (err, result) => {
        if (err) return res.status(500).json(err);
        io.emit("dataChanged", { table: "channel_activity" });
        res.json({ message: "added" });
    });
}










exports.getChannelActivity = (req, res,io) => {
   const userId = req.query.user_id || null;
    const ch_id = req.params.ch_id;

    const sql = `SELECT users.uuid, users.roles, users.username, users.profile,
        channel_activity.ch_ac_id, channel_activity.ch_ac_image, channel_activity.ch_ac_auther,
        channel_activity.ch_id, channel_activity.ch_ac_content, channel_activity.created_at,
        COALESCE(cal.likes_count, 0) AS likes_count,
        COALESCE(cal.dislikes_count, 0) AS dislikes_count,
        (
            SELECT reaction_type FROM channel_activity_likes
            WHERE ch_ac_id = channel_activity.ch_ac_id AND user_id = ?
            LIMIT 1
        ) AS user_reaction
        FROM users INNER JOIN  channel_activity ON  users.uuid= channel_activity.ch_ac_auther
        LEFT JOIN (
            SELECT ch_ac_id,
                COUNT(CASE WHEN reaction_type = 'like' THEN 1 END) AS likes_count,
                COUNT(CASE WHEN reaction_type = 'dislike' THEN 1 END) AS dislikes_count
            FROM channel_activity_likes
            GROUP BY ch_ac_id
        ) cal ON cal.ch_ac_id = channel_activity.ch_ac_id
        WHERE ch_id = ?   ORDER BY channel_activity.created_at DESC`;

    db.query(sql, [userId, ch_id], (err, result) => {
        if (err) return res.status(500).json(err);
         
        res.json(result);
        console.log(result);
      
    });
}

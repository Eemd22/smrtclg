const db = require("../config/db");

// التحقق مما إذا كان المستخدم يتابع مستخدم آخر
exports.checkFollow = (req, res) => {
    const { follower_id, following_id } = req.query;

    if (!follower_id || !following_id) {
        return res.status(400).json({ message: "follower_id and following_id are required" });
    }

    db.query(
        "SELECT * FROM followers WHERE follower_id = ? AND following_id = ?",
        [follower_id, following_id],
        (err, result) => {
            if (err) return res.status(500).json(err);
            res.json({ isFollowing: result.length > 0 });
        }
    );
};

// متابعة مستخدم
exports.follow = (req, res, io) => {
    const { follower_id, following_id } = req.body;

    if (!follower_id || !following_id) {
        return res.status(400).json({ message: "follower_id and following_id are required" });
    }

    if (follower_id === following_id) {
        return res.status(400).json({ message: "Cannot follow yourself" });
    }

    // التحقق من عدم وجود المتابعة مسبقاً
    db.query(
        "SELECT * FROM followers WHERE follower_id = ? AND following_id = ?",
        [follower_id, following_id],
        (err, result) => {
            if (err) return res.status(500).json(err);
            if (result.length > 0) {
                return res.status(400).json({ message: "Already following" });
            }

            db.query(
                "INSERT INTO followers (follower_id, following_id) VALUES (?, ?)",
                [follower_id, following_id],
                (err2) => {
                    if (err2) return res.status(500).json(err2);
                    io.emit("dataChanged");
                    res.json({ message: "Followed" });
                }
            );
        }
    );
};

// إلغاء متابعة مستخدم
exports.unfollow = (req, res, io) => {
    const { follower_id, following_id } = req.body;

    if (!follower_id || !following_id) {
        return res.status(400).json({ message: "follower_id and following_id are required" });
    }

    db.query(
        "DELETE FROM followers WHERE follower_id = ? AND following_id = ?",
        [follower_id, following_id],
        (err, result) => {
            if (err) return res.status(500).json(err);
            io.emit("dataChanged");
            res.json({ message: "Unfollowed" });
        }
    );
};

// جلب عدد المتابعين والمتابَعين لمستخدم
exports.getFollowCounts = (req, res) => {
    const { userid } = req.params;

    db.query(
        `SELECT 
            (SELECT COUNT(*) FROM followers WHERE following_id = ?) AS followers_count,
            (SELECT COUNT(*) FROM followers WHERE follower_id = ?) AS following_count`,
        [userid, userid],
        (err, result) => {
            if (err) return res.status(500).json(err);
            res.json(result[0] || { followers_count: 0, following_count: 0 });
        }
    );
};

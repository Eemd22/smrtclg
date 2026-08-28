const db = require("../config/db");

// حفظ أطراف المحادثة بترتيب ثابت (الأصغر ثم الأكبر) لتجنب التكرار
function normalizePair(a, b) {
    return a < b ? [a, b] : [b, a];
}

// إنشاء أو جلب محادثة بين مستخدمين
exports.getOrCreateConversation = (req, res, io) => {
    const { user_one, user_two } = req.body;

    if (!user_one || !user_two) {
        return res.status(400).json({ message: "user_one and user_two are required" });
    }
    if (user_one === user_two) {
        return res.status(400).json({ message: "Cannot chat with yourself" });
    }

    const [u1, u2] = normalizePair(user_one, user_two);

    db.query(
        "SELECT * FROM conversations WHERE user_one = ? AND user_two = ?",
        [u1, u2],
        (err, result) => {
            if (err) return res.status(500).json(err);
            if (result.length > 0) {
                return res.json({ conversation: result[0] });
            }

            db.query(
                "INSERT INTO conversations (user_one, user_two) VALUES (?, ?)",
                [u1, u2],
                (err2, insertResult) => {
                    if (err2) return res.status(500).json(err2);
                    const conversation = {
                        id: insertResult.insertId,
                        user_one: u1,
                        user_two: u2,
                        last_message: null,
                        last_sender: null,
                        last_message_at: null,
                    };
                    io.emit("dataChanged", { table: "conversations" });
                    res.json({ conversation });
                }
            );
        }
    );
};

// جلب قائمة محادثات المستخدم مع بيانات الطرف الآخر وآخر رسالة
exports.getConversations = (req, res) => {
    const { userId } = req.params;

    if (!userId) return res.status(400).json({ message: "userId is required" });

    // السؤال القياسي (متوافق مع MySQL و TiDB): الانضمام إلى جدول users مرتين
    // ثم تحديد "الطرف الآخر" في الكود بدلاً من IF داخل JOIN
    const sql = `
        SELECT c.id AS conversation_id,
               c.user_one, c.user_two,
               c.last_message, c.last_sender, c.last_message_at,
               c.created_at,
               u1.username AS user_one_username, u1.profile AS user_one_profile, u1.roles AS user_one_roles,
               u2.username AS user_two_username, u2.profile AS user_two_profile, u2.roles AS user_two_roles,
               (SELECT COUNT(*) FROM messages m
                WHERE m.conversation_id = c.id AND m.sender_id <> ? AND m.is_read = 0
               ) AS unread_count
        FROM conversations c
        INNER JOIN users u1 ON u1.uuid = c.user_one
        INNER JOIN users u2 ON u2.uuid = c.user_two
        WHERE c.user_one = ? OR c.user_two = ?
        ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
    `;

    db.query(sql, [userId, userId, userId], (err, result) => {
        if (err) return res.status(500).json(err);

        // تحديد الطرف الآخر ومستوى القوائم الناتجة
        const rows = result.map((r) => {
            const isUserOne = r.user_one === userId;
            return {
                conversation_id: r.conversation_id,
                user_one: r.user_one,
                user_two: r.user_two,
                last_message: r.last_message,
                last_sender: r.last_sender,
                last_message_at: r.last_message_at,
                created_at: r.created_at,
                unread_count: r.unread_count || 0,
                other_user_id: isUserOne ? r.user_two : r.user_one,
                other_username: isUserOne ? r.user_two_username : r.user_one_username,
                other_profile: isUserOne ? r.user_two_profile : r.user_one_profile,
                other_roles: isUserOne ? r.user_two_roles : r.user_one_roles,
            };
        });

        res.json(rows);
    });
};

// جلب رسائل محادثة معينة (مع تعليمها كمقروءة)
exports.getMessages = (req, res, io) => {
    const { conversationId, userId } = req.params;

    if (!conversationId) return res.status(400).json({ message: "conversationId is required" });

    // تحديد رسائل الطرف الآخر كمقروءة
    db.query(
        "UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id <> ? AND is_read = 0",
        [conversationId, userId],
        (err) => {
            if (err) return res.status(500).json(err);

            db.query(
                `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.is_read, m.created_at,
                        u.username AS sender_username, u.profile AS sender_profile
                 FROM messages m
                 INNER JOIN users u ON u.uuid = m.sender_id
                 WHERE m.conversation_id = ?
                 ORDER BY m.created_at ASC`,
                [conversationId],
                (err2, result) => {
                    if (err2) return res.status(500).json(err2);
                    io.emit("dataChanged", { table: "messages_read" });
                    res.json(result);
                }
            );
        }
    );
};

// إرسال رسالة داخل محادثة
exports.sendMessage = (req, res, io) => {
    const { conversation_id, sender_id, content } = req.body;

    if (!conversation_id || !sender_id || !content) {
        return res.status(400).json({ message: "conversation_id, sender_id and content are required" });
    }

    const message = content.toString().trim();
    if (!message) {
        return res.status(400).json({ message: "Message cannot be empty" });
    }

    db.query(
        "INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)",
        [conversation_id, sender_id, message],
        (err, result) => {
            if (err) return res.status(500).json(err);

            const messageId = result.insertId;

            // تحديث آخر رسالة في المحادثة
            db.query(
                "UPDATE conversations SET last_message = ?, last_sender = ?, last_message_at = CURRENT_TIMESTAMP WHERE id = ?",
                [message, sender_id, conversation_id],
                (err2) => {
                    if (err2) return res.status(500).json(err2);

                    db.query(
                        `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.is_read, m.created_at,
                                u.username AS sender_username, u.profile AS sender_profile
                         FROM messages m
                         INNER JOIN users u ON u.uuid = m.sender_id
                         WHERE m.id = ?`,
                        [messageId],
                        (err3, messages) => {
                            if (err3) return res.status(500).json(err3);
                            const sent = messages[0] || {
                                id: messageId,
                                conversation_id,
                                sender_id,
                                content: message,
                            };
                            // بث رسالة جديدة فورية لكل الأجهزة
                            io.emit("newMessage", { conversationId: conversation_id, message: sent });
                            io.emit("dataChanged", { table: "conversations" });
                            res.json({ message: sent });
                        }
                    );
                }
            );
        }
    );
};

// تحديد كل رسائل المحادثة كمقروءة لعرض المستخدم
exports.markRead = (req, res) => {
    const { conversationId, userId } = req.params;

    db.query(
        "UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id <> ? AND is_read = 0",
        [conversationId, userId],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: "Marked as read" });
        }
    );
};

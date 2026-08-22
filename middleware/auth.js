const jwt = require("jsonwebtoken");
const db = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "smart_college_dev_secret_change_me";
const TOKEN_TTL = process.env.JWT_TTL || "30d";

if (!process.env.JWT_SECRET) {
    console.warn("[auth] JWT_SECRET غير مضبوط - يتم استخدام مفتاح التطوير الافتراضي. اضبطه في بيئة الإنتاج!");
}

// توليد توكن لمستخدم
function signToken(user) {
    return jwt.sign(
        { uuid: user.uuid, roles: user.roles || null },
        JWT_SECRET,
        { expiresIn: TOKEN_TTL }
    );
}

// استخراج التوكن من الهيدر (Authorization: Bearer x أو x-auth-token)
function extractToken(req) {
    const header = req.headers["authorization"];
    if (header && header.startsWith("Bearer ")) return header.slice(7);
    if (req.headers["x-auth-token"]) return req.headers["x-auth-token"];
    return null;
}

// يرفق بيانات المستخدم إذا وُجد توكن صالح - لا يمنع أي طلب أبداً
// (متوافق 100% مع التطبيق الحالي، يجهز req.user للتحديث القادم)
function optionalAuth(req, res, next) {
    const token = extractToken(req);
    if (token) {
        try {
            req.user = jwt.verify(token, JWT_SECRET);
        } catch (_) {
            req.user = null;
        }
    }
    next();
}

// حماية صارمة: يرفض الطلبات بدون توكن صالح
function verifyToken(req, res, next) {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ message: "مطلوب تسجيل الدخول" });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (_) {
        return res.status(401).json({ message: "جلسة غير صالحة أو منتهية" });
    }
}

// جلب الدور الحالي من قاعدة البيانات بدل الاعتماد على التوكن القديم
function freshRole(userUuid, cb) {
    db.query("SELECT roles FROM users WHERE uuid=?", [userUuid], (err, rows) => {
        if (err || !rows || rows.length === 0) return cb(null);
        cb(rows[0].roles || null);
    });
}

// حماية صارمة + التحقق من الدور (يُقرأ الدور من قاعدة البيانات وليس من التوكن)
function requireRole(...roles) {
    return (req, res, next) => {
        verifyToken(req, res, () => {
            freshRole(req.user.uuid, (role) => {
                if (!role || !roles.includes(role)) {
                    return res.status(403).json({ message: "ليست لديك صلاحية لهذا الإجراء" });
                }
                req.user.roles = role;
                next();
            });
        });
    };
}

// يسمح فقط لمالك الحساب نفسه أو للمشرف (دور المشرف يُقرأ من قاعدة البيانات)
function requireSelfOrAdmin(paramName = "userid") {
    return (req, res, next) => {
        verifyToken(req, res, () => {
            if (req.user.uuid === req.params[paramName]) {
                return next();
            }
            freshRole(req.user.uuid, (role) => {
                if (role === "مشرف") {
                    req.user.roles = role;
                    return next();
                }
                return res.status(403).json({ message: "ليست لديك صلاحية لهذا الإجراء" });
            });
        });
    };
}

// يتحقق من ملكية السجل قبل الحذف/التعديل: المالك أو "مشرف" فقط
// الاستخدام: verifyOwnership({ table: "posts", idColumn: "id", ownerColumn: "user_id", param: "id" })
function verifyOwnership({ table, idColumn, ownerColumn, param }) {
    return (req, res, next) => {
        verifyToken(req, res, () => {
            db.query(
                `SELECT ${ownerColumn} AS owner FROM ${table} WHERE ${idColumn}=?`,
                [req.params[param]],
                (err, rows) => {
                    if (err) return res.status(500).json(err);
                    if (!rows || rows.length === 0) {
                        return res.status(404).json({ message: "العنصر غير موجود" });
                    }
                    if (rows[0].owner === req.user.uuid) {
                        req.isOwner = true;
                        return next();
                    }
                    freshRole(req.user.uuid, (role) => {
                        if (role === "مشرف") {
                            req.isOwner = false;
                            return next();
                        }
                        return res.status(403).json({ message: "ليست لديك صلاحية لهذا الإجراء" });
                    });
                }
            );
        });
    };
}

module.exports = { signToken, optionalAuth, verifyToken, requireRole, requireSelfOrAdmin, verifyOwnership };

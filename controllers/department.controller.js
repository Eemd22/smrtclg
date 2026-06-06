const db = require("../config/db");
// ##################### دهحالة جلب الاقسام #####################
exports.getDept = (req, res) => {
    const sql = `
        SELECT * FROM departments
    `;
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json(err);
        //    io.emit("dataChanged"); 
        res.json(result);
        console.log("emad");
    });
}



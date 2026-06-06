
const db = require("../config/db");
const {v4: uuid} = require('uuid');
const uid = uuid();
const uuuid = "userID:"+uid;


// دالة جلب المستندات \
exports.getLecture = (req, res) => {
 
    db.query(` SELECT * from lecture`,
     (err, result) => {
        if (err) return res.status(500).json(err);
        console.log(result);
        res.json(result);
        
    });
};


// add documents

exports.addLecture=
    (req, res,io) => {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No File"
            });
        }
        const fileName = req.file.originalname;
        const level = req.body.level;
        db.query(
            "INSERT INTO lecture(lec_title,lec_url,lec_level) VALUES(?,?,?)",
            [fileName,fileName,level],
            (err, result) => {
                if (err) {
                    return res.status(500).json(err);
                }
                res.json({
                    success: true,
                    file: req.file.filename,
                  
                
                });
            }
        );
    }

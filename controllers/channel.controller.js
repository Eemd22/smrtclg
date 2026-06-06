const db = require("../config/db");


exports.getChannel = (req, res,io) => {
   const id = req.params.userid;
   
    db.query(` SELECT users.username,users.profile,channels.ch_id,
        channels.user_id, channels.channel_image,
        channels.channel_name FROM users INNER JOIN  channels ON  users.uuid= channels.user_id
        
    `,
         [id], (err, result) => {
        if (err) return res.status(500).json(err);
         
        res.json(result);
        console.log(result);
      
    });
}




exports.addChannel = (req, res, io) => {
  
    const { channel_name,userid} = req.body;
    const image = req.file ? `channel/uploads/${req.file.filename}` : null;

   
    const sql = 'INSERT INTO channels (channel_name,channel_image,user_id) VALUES (?,?,?)';
   db.query(sql, [channel_name, image,userid], (err, result) => {
        if (err) return res.status(500).json(err);
        // io.emit("dataChanged");

        res.json({ message: "added" });
    });
}


// ############## مسار اضافة محتوي في القناة ##################

exports.addChannelActivity = (req, res,io) => {
    const {ch_id, auther_id,content} = req.body;

     const image = req.file ? `channelActivity/uploads/${req.file.filename}` : null;
const _sql ='INSERT INTO channel_activity (ch_ac_image,ch_ac_auther,ch_id,ch_ac_content) VALUES (?,?,?,?)';
   db.query(_sql, 
    [image, auther_id,ch_id,content], 
     (err, result) => {
         console.log(req.body);
        console.log(req.file);
        console.log(err);
        if (err) return res.status(500).json(err);
        // io.emit("dataChanged");
       

        res.json({ message: "added" });
    }          );
}










exports.getChannelActivity = (req, res,io) => {
   const id = req.params.userid;
    const ch_id = req.params.ch_id;
   
    db.query(`SELECT *
        FROM users INNER JOIN  channel_activity ON  users.uuid= channel_activity.ch_ac_auther WHERE ch_id = ?   ORDER BY channel_activity.created_at DESC`,
         [ch_id], (err, result) => {
        if (err) return res.status(500).json(err);
         
        res.json(result);
        console.log(result);
      
    });
}

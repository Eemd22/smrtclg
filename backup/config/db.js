const mysql = require('mysql2');
const db = mysql.createConnection({

	"host": "localhost",
	"user" : "root",
	"password" : "",
	"database" : "smart_college"
});

db.connect((err){
if(err){
	console.error("DB Error",err);
}else{
	console.log("Myswl Connected");
}

});

module.exports = db;

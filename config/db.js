
const mysql = require("mysql2");


const db = mysql.createConnection({
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE
});
db.connect((err) => {
    if (err) {
        console.log("Database error", err);
    } else {
        console.log("Database connected");
    }
});

module.exports = db;


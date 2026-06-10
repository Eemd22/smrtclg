
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const path = require("path");
const {v4: uuid} = require('uuid');
const id = uuid();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// اكواد السماح للتطبيق بالكتابة داخل الملفات
app.use("/users/uploads", express.static("users/uploads"));
app.use("/posts/uploads", express.static("posts/uploads"));
app.use("/boards/uploads", express.static("boards/uploads"));
app.use("/departments/uploads", express.static("departments/uploads"));
app.use("/alboum/uploads", express.static("alboum/uploads"));
app.use("/channel/uploads", express.static("channel/uploads"));
app.use("/channelActivity/uploads", express.static("channelActivity/uploads"));
app.use("/lecture/uploads", express.static("lecture/uploads"));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// إعداد السوكيت
io.on("connection", (socket) => {
    console.log("User connected");
});



// استدعاء الراوت وتمرير io له
const apiRoutes = require("./routes/api")(io);
app.use("/", apiRoutes);

server.listen(PORT, () => {
    console.log("Server running on port 3000");
});


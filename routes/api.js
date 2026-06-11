

 const express = require("express");
 const router = express.Router();

// اكواد التحكم في الروابط
 const postController = require("../controllers/post.controller");
 const userController = require("../controllers/user.controller");
 const commentController = require("../controllers/comment.controller");
 const dashboadController = require("../controllers/dashboard.controller");
 const likecommentController = require("../controllers/like.commentController");
 const boardController = require("../controllers/board.controller");
 const departmentController = require("../controllers/department.controller");
 const activityController = require("../controllers/activity.controller");
 const alboumController = require("../controllers/alboum.controller");
 const channelController = require("../controllers/channel.controller");
  const lectureController = require("../controllers/lecture_contrroler");

// اكواد رفع الملفات
 const upload = require("../middleware/users");
 const post = require("../middleware/post");
 const board = require("../middleware/board");
 const departments= require("../middleware/department");
 const alboum= require("../middleware/alboum");
 const channel= require("../middleware/channel");
 const channelActivity =require("../middleware/channel_activity");
 const lecture=require('../middleware/documents_upload');


 module.exports = (io) => {
    // Route Posts مسارات توجيه جدول المنشورات
 router.get("/post", postController.getAllPosts);
 router.get("/post/:uid", (req, res) => postController.getAllPostsById(req,res,io));
 router.post("/post", post.single("image"), (req, res) => postController.addPost(req, res, io));
 router.put("/delete_post/:id", post.single("image"), (req, res) => postController.deletePost(req, res, io));
 router.put("/edit_post/:postid", (req, res) => postController.editPost(req, res, io));


    // Route Users مسارات توجيه جدول المستخدمين
 router.post("/get_user", userController.login);
 router.post("/add_user", (req, res) => userController.addUser(req, res, io));
 router.post("/profile/:userid", upload.single("image"),  (req, res) => userController.editProfile(req, res, io));
 router.get("/get_user_by_id",  (req, res) => userController.getUserBiId(req, res));
 router.get("/userid/:userid",  (req, res) => userController.getM(req, res));
router.get("/get_allusers",  (req, res) => userController.getAllUser(req, res));
router.get("/get_users_byid/:userid",  (req, res) => userController.getAllUserBYId(req, res));


 router.post("/change_role", (req, res) => userController.editRoleUser(req, res));

       

// Route Comment مسارات اتوجيه التعاليق

 router.post("/add_comment", (req, res) => commentController.addComment(req, res, io));

   
  
// Route Likjs مسارات توجيه الاعجابات 
 router.post("/add_likes", (req, res) => likecommentController.addLikes(req, res, io));



// Route Statistic  مسار الاحصائيات
 router.get("/statistic", (req, res) => dashboadController.GetStatistic(req, res));
  
    
// Route Board 
// getBoard

// Route   مسارات توجيه البورت الالكتروني
 router.get("/getBoard", (req, res) => boardController.getBoard(req, res, io));
 router.post("/addBoard", board.single("image"), (req, res) => boardController.addBoard(req, res, io));
 router.put("/delete_board/:b_id", board.single("image"), (req, res) => boardController.deleteBoard(req, res, io));
 router.put("/edit_board/:b_id", (req, res) => boardController.editBoard(req, res, io));

    
// leacture




// timetable route



// departments  مسارات توجيه الاقسام

 router.get("/department", departmentController.getDept);

// activityes

// getActivity مسارات التوجيه للانشطة
 router.get("/getActivity", (req, res) => activityController.getActivity(req,res,io));
 router.post("/add_activity", departments.single("image"), (req, res) => activityController.addActivity(req, res, io));
 router.put("/delete_activity/:id",  (req, res) => activityController.deleteActivity(req, res, io));
 router.put("/edit_activity/:id", (req, res) => activityController.editActivity(req, res, io));

 
 //  edit_activity

//  add_abboum راوت البوم الاقسام
 router.post("/add_abboum", alboum.single("image"), (req, res) => alboumController.addAlboum(req, res, io));
 router.get("/getAlboum", (req, res) => alboumController.getAlboum(req,res,io));

// end add_abboum

// مسارات التوجيه للفناة
 router.post("/add_channel", channel.single("image"), (req, res)=> channelController.addChannel(req,res,io));
 
 router.get("/get_channel",(req,res)=>channelController.getChannel(req,res));














//  ############### اضافة محتوى في القناة  ############## 
 router.post("/add_channel_activity/", channelActivity.single("image"), (req, res)=> channelController.addChannelActivity(req,res,io));
 
 
 
 
 
 
 
 
 





 
 
 
 
 
 router.get("/get_channel_activity/:ch_id",  (req, res)=> channelController.getChannelActivity(req,res,io));
  router.get("/lectures",  (req, res)=> lectureController.getlectures(req,res,io));

//  lecture 
router.get("/get_lecture",  (req, res,io)=> lectureController.getLecture(req,res,io));
router.post("/upload_lecture/", lecture.single("file"), (req, res)=> lectureController.addLecture(req,res,io));
 return router;
};


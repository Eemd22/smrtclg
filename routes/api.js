

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
const timetableController = require("../controllers/timetable.controller");
 const followController = require("../controllers/follow.controller");
 const aiController = require("../controllers/ai.controller");
   const boardLikeController = require("../controllers/board.likeController");
   const activityLikeController = require("../controllers/activity.likeController");
    const activityCommentController = require("../controllers/activity.commentController");
    const boardCommentController = require("../controllers/board.commentController");
  const channelActivityLikeController = require("../controllers/channelActivity.likeController");

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
    // مصادقة اختيارية: ترفق req.user عند وجود توكن صالح ولا تمنع أي طلب
    router.use(require("../middleware/auth").optionalAuth);

    // تقديم الملفات المخزنة في قاعدة البيانات (تخزين دائم)
    const { getUpload } = require("../services/db-storage.service");
    router.get("/db/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            if (!Number.isInteger(id) || id <= 0) return res.status(404).end();
            const file = await getUpload(id);
            if (!file) return res.status(404).end();
            // المعرفات فريدة وغير قابلة للتغيير، لذا يمكن تخزينها مؤقتاً للأبد
            res.set("Content-Type", file.mime);
            res.set("Cache-Control", "public, max-age=31536000, immutable");
            res.send(file.data);
        } catch (_) {
            res.status(500).end();
        }
    });

    // التحقق من ملكية المحتوى قبل الحذف/التعديل (المالك أو "مشرف")
    const ownPost = require("../middleware/auth").verifyOwnership({ table: "posts", idColumn: "id", ownerColumn: "user_id", param: "id" });
    const ownPostEdit = require("../middleware/auth").verifyOwnership({ table: "posts", idColumn: "id", ownerColumn: "user_id", param: "postid" });
    const ownBoard = require("../middleware/auth").verifyOwnership({ table: "board", idColumn: "b_id", ownerColumn: "user_id", param: "b_id" });
    const ownActivity = require("../middleware/auth").verifyOwnership({ table: "activites", idColumn: "id", ownerColumn: "user_id", param: "id" });

    // Route Posts مسارات توجيه جدول المنشورات
 router.get("/post", postController.getAllPosts);
 router.get("/post/:uid", (req, res) => postController.getAllPostsById(req,res,io));
 router.post("/post", post.single("image"), (req, res) => postController.addPost(req, res, io));
 router.put("/delete_post/:id", ownPost, post.single("image"), (req, res) => postController.deletePost(req, res, io));
 router.put("/edit_post/:postid", ownPostEdit, (req, res) => postController.editPost(req, res, io));


    // Route Users مسارات توجيه جدول المستخدمين
 router.post("/get_user", userController.login);
 router.post("/add_user", (req, res) => userController.addUser(req, res, io));
 router.post("/profile/:userid", upload.single("image"),  (req, res) => userController.editProfile(req, res, io));
 router.post("/cover/:userid", upload.single("image"),  (req, res) => userController.editCoverImage(req, res, io));
 router.get("/get_user_by_id/:userid",  (req, res) => userController.getUserBiId(req, res));
router.get("/get_allusers",  (req, res) => userController.getAllUser(req, res));
router.get("/get_users_byid/:userid",  (req, res) => userController.getAllUserBYId(req, res));


 router.post("/change_role", require("../middleware/auth").requireRole("مشرف"), (req, res) => userController.editRoleUser(req, res, io));
 router.put("/update_profile/:userid", (req, res) => userController.updateUserData(req, res, io));
 router.post("/change_password/:userid", require("../middleware/auth").requireSelfOrAdmin("userid"), (req, res) => userController.changePassword(req, res, io));
 router.post("/forgot_password", (req, res) => userController.forgotPassword(req, res, io));
 router.delete("/users/:id", require("../middleware/auth").requireSelfOrAdmin("id"), (req, res) => userController.deleteUser(req, res, io));

       

// Route Comment مسارات اتوجيه التعاليق

 router.post("/add_comment", (req, res) => commentController.addComment(req, res, io));
 router.get("/get_post_comments/:post_id", (req, res) => commentController.getPostComments(req, res));

   
  
// Route Likjs مسارات توجيه الاعجابات 
 router.post("/add_likes", (req, res) => likecommentController.addLikes(req, res, io));



// Route Statistic  مسار الاحصائيات
 router.get("/statistic", (req, res) => dashboadController.GetStatistic(req, res));
  
    
// Route Board 
// getBoard

// Route   مسارات توجيه البورت الالكتروني
 router.get("/getBoard", (req, res) => boardController.getBoard(req, res, io));
 router.post("/addBoard", board.single("image"), (req, res) => boardController.addBoard(req, res, io));
 router.put("/delete_board/:b_id", ownBoard, board.single("image"), (req, res) => boardController.deleteBoard(req, res, io));
 router.put("/edit_board/:b_id", ownBoard, (req, res) => boardController.editBoard(req, res, io));

// Route Board Likes مسارات اعجابات البورد
 router.post("/add_board_like", (req, res) => boardLikeController.addBoardLike(req, res, io));

// Route Board Comments مسارات تعليقات البورد
 router.post("/add_board_comment", (req, res) => boardCommentController.addBoardComment(req, res, io));
 router.get("/get_board_comments/:b_id", (req, res) => boardCommentController.getBoardComments(req, res));

// Route Activity Likes مسارات اعجابات الانشطة
 router.post("/add_activity_like", (req, res) => activityLikeController.addActivityLike(req, res, io));

// Route Activity Comments مسارات تعليقات الانشطة
 router.post("/add_activity_comment", (req, res) => activityCommentController.addActivityComment(req, res, io));
 router.get("/get_activity_comments/:activityId", (req, res) => activityCommentController.getActivityComments(req, res));

    
// leacture




// timetable route
// إدارة جدول المحاضرات (CRUD كامل) - الإضافة/التعديل للمشرف والمحاضر، والحذف للمشرف فقط
router.get("/timetable/references", require("../middleware/auth").requireRole("مشرف", "محاضر"), timetableController.getReferences);
router.get("/timetable/lecture/:id", require("../middleware/auth").requireRole("مشرف", "محاضر"), timetableController.getLectureById);
router.post("/lectures", require("../middleware/auth").requireRole("مشرف", "محاضر"), (req, res) => timetableController.addLecture(req, res, io));
router.put("/lectures/:id", require("../middleware/auth").requireRole("مشرف", "محاضر"), (req, res) => timetableController.updateLecture(req, res, io));
router.delete("/lectures/:id", require("../middleware/auth").requireRole("مشرف", "محاضر"), (req, res) => timetableController.deleteLecture(req, res, io));
router.post("/courses", require("../middleware/auth").requireRole("مشرف", "محاضر"), (req, res) => timetableController.addCourse(req, res, io));
router.post("/halls", require("../middleware/auth").requireRole("مشرف", "محاضر"), (req, res) => timetableController.addHall(req, res, io));



// departments  مسارات توجيه الاقسام

 router.get("/department", departmentController.getDept);

// activityes

// getActivity مسارات التوجيه للانشطة
 router.get("/getActivity", (req, res) => activityController.getActivity(req,res,io));
 router.post("/add_activity", departments.single("image"), (req, res) => activityController.addActivity(req, res, io));
 router.put("/delete_activity/:id", ownActivity, (req, res) => activityController.deleteActivity(req, res, io));
 router.put("/edit_activity/:id", ownActivity, (req, res) => activityController.editActivity(req, res, io));

 
 //  edit_activity

//  add_abboum راوت البوم الاقسام
 router.post("/add_abboum", alboum.single("image"), (req, res) => alboumController.addAlboum(req, res, io));
 router.get("/getAlboum", (req, res) => alboumController.getAlboum(req,res,io));

// end add_abboum

// مسارات التوجيه للفناة
// اضافة مجتمع متاحة فقط للمشرف والمحاضر
 router.post("/add_channel", require("../middleware/auth").requireRole("مشرف", "محاضر"), channel.single("image"), (req, res)=> channelController.addChannel(req,res,io));
 
 router.get("/get_channel",(req,res)=>channelController.getChannel(req,res));














//  ############### اضافة محتوى في المجتمع  ############## 
 router.post("/add_channel_activity/", channelActivity.single("image"), (req, res)=> channelController.addChannelActivity(req,res,io));

// Route Channel Activity Likes مسارات اعجابات محتوى المجتمع
 router.post("/add_channel_activity_like", (req, res) => channelActivityLikeController.addChannelActivityLike(req, res, io));
 
 
 
 
 
 
 
 
 





 
 
 
 
 
  router.get("/get_channel_activity/:ch_id",  (req, res)=> channelController.getChannelActivity(req,res,io));
  router.get("/lectures",  (req, res)=> timetableController.getlectures(req,res,io));
  router.put("/lectures/:id/status", (req, res) => timetableController.updateLectureStatus(req, res, io));

// Route Follow مسارات المتابعة
 router.get("/check_follow", (req, res) => followController.checkFollow(req, res));
 router.post("/follow", (req, res) => followController.follow(req, res, io));
 router.post("/unfollow", (req, res) => followController.unfollow(req, res, io));
 router.get("/follow_counts/:userid", (req, res) => followController.getFollowCounts(req, res));

//  lecture 
router.get("/get_lecture",  (req, res)=> lectureController.getLecture(req,res));
router.post("/upload_lecture/", (req, res) => {
    lecture.single("file")(req, res, (err) => {
        if (err) {
            const message = err.code === "LIMIT_FILE_SIZE"
                ? "حجم الملف كبير جداً، الحد الأقصى 25 ميجابايت"
                : err.code === "UNSUPPORTED_FILE_TYPE"
                    ? err.message
                    : "فشل رفع الملف، حاول مجدداً";
            return res.status(400).json({ success: false, message });
        }
        lectureController.addLecture(req, res, io);
    });
});

// Route AI مسارات الذكاء الاصطناعي
router.post("/ai/summarize", aiController.summarize);
router.post("/ai/search", aiController.smartSearch);
router.post("/ai/chat", aiController.chatbot);
router.post("/ai/tags", aiController.suggestTags);

// TEMP maintenance cleanup (سيُحذف بعد الاستخدام)
router.post("/maintenance/cleanup", (req, res) => {
    const KEY = "mv4naskox1e6dyzch0jr92gq7iw8bpu3";
    if ((req.headers["x-maint-key"] || "") !== KEY) return res.status(403).json({ message: "forbidden" });
    if (!req.body || req.body.confirm !== "DELETE") return res.status(400).json({ message: "confirm required" });
    const db = require("../config/db");
    const KEEP_UUID = "885e493b-5c9b-4880-8cae-d2a9feb06880";
    db.query("DELETE FROM users WHERE uuid <> ?", [KEEP_UUID], (e1, r1) => {
        if (e1) return res.status(500).json({ step: "users", error: e1.message });
        db.query("DELETE FROM halls", (e2, r2) => {
            if (e2) return res.status(500).json({ step: "halls", error: e2.message });
            db.query("DELETE FROM courses", (e3, r3) => {
                if (e3) return res.status(500).json({ step: "courses", error: e3.message });
                res.json({
                    ok: true,
                    users_deleted: r1.affectedRows,
                    halls_deleted: r2.affectedRows,
                    courses_deleted: r3.affectedRows
                });
            });
        });
    });
});

 return router;
};


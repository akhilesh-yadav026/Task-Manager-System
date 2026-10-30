const express = require("express");

const {
  createComment,
  getTaskComments,
  updateComment,
  deleteComment,
} = require("../controllers/comment.controller.js");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router({ mergeParams: true });

router.use(protect);

router
  .route("/")
  .post(createComment)
  .get(getTaskComments);

router
  .route("/:commentId")
  .put(updateComment)
  .delete(deleteComment);

module.exports = router;
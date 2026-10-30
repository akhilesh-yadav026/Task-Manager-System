const express =  require("express")
const {login, logout, getMe, getAllUsers} = require("../controllers/user.controller.js")
const {protect} = require("../middleware/authMiddleware.js")
const authorizeRoles = require("../middleware/authorizeRoles.js")

const router =  express.Router()

// router.post("/register", register);
router.post("/login",login)
router.post("/logout", logout)
router.get("/me",protect, getMe)
router.get("/", protect, authorizeRoles("admin"), getAllUsers)
router.get(
  "/admin-only",
  protect,
  authorizeRoles("admin"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Welcome, Admin!",
    });
  }
);

module.exports = router

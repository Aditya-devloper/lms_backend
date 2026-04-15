const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const passport = require("passport");

const {
  sendOTP,
  verifyOTP,
  verifyPin,
  createAgent,
  getUserById,
  removeAgent,
  updateUser,
  logoutUser,
} = require("../controllers/user");
const { validateEmail, validateUser } = require("../middleware/validator");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "..", "uploads", "users"));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

router.post("/getOtp", validateEmail, sendOTP);
router.post("/verifyOtp", verifyOTP);
router.post("/verifyPin", verifyPin);

router.post(
  "/createAgent",
  passport.authenticate("jwt", { session: false }),
  validateUser,
  upload.single("image"),
  createAgent,
);

router.post(
  "/getUserById",
  passport.authenticate("jwt", { session: false }),
  getUserById,
);

router.post(
  "/logoutUser",
  passport.authenticate("jwt", { session: false }),
  logoutUser,
);

router.post(
  "/update/:id",
  passport.authenticate("jwt", { session: false }),
  validateUser,
  upload.single("image"),
  updateUser,
);

router.post(
  "/removeAgent/:id",
  passport.authenticate("jwt", { session: false }),
  removeAgent,
);

module.exports = router;

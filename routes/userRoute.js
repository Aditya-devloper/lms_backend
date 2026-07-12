const path = require("path");
const fs = require("fs");
const router = require("express").Router();
const passport = require("passport");
const cloudinary = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

const {
  sendOTP,
  verifyOTP,
  verifyPin,
  createAgent,
  getUserById,
  removeAgent,
  updateUser,
  logoutUser,
  createAccount,
  googleLogin,
} = require("../controllers/user");
const {
  validateEmail,
  validateUser,
  validateEmailPass,
} = require("../middleware/validator");

// Multer storge
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     const uploadPath = path.join(__dirname, "..", "uploads", "users");
//     if (!fs.existsSync(uploadPath)) {
//       fs.mkdirSync(uploadPath, { recursive: true });
//     }
//     cb(null, uploadPath);
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + "-" + file.originalname);
//   },
// });

// Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "users", // cloudinary pe folder name
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [{ width: 500, height: 500, crop: "limit" }], // optional
  },
});

const upload = multer({ storage, limits: { fileSize: 500 * 1024 } }); // 500KB

router.post("/getOtp", validateEmail, sendOTP);
router.post("/login", validateEmailPass, createAccount);
router.post("/googleLogin", googleLogin);
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
  // upload.single("image"),
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      console.log("cloudinary error", err);
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            status: false,
            message: "Image size should not exceed 500KB",
          });
        }
        return res.status(400).json({ status: false, message: err.message });
      } else if (err) {
        return res.status(400).json({ status: false, message: err.message });
      }
      next();
    });
  },
  updateUser,
);

router.post(
  "/removeAgent/:id",
  passport.authenticate("jwt", { session: false }),
  removeAgent,
);

module.exports = router;

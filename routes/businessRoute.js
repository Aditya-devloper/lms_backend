const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const passport = require("passport");

const {
  getBusiness,
  createBusiness,
  updateBusiness,
  getBusinessById,
} = require("../controllers/business");
const { isOwner } = require("../middleware/permissions");
const { validateBusiness } = require("../middleware/validator");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "..", "uploads", "users"));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

router.post(
  "/getBusiness",
  passport.authenticate("jwt", { session: false }),
  getBusiness,
);

router.post(
  "/createBusiness",
  passport.authenticate("jwt", { session: false }),
  isOwner,
  validateBusiness,
  upload.single("image"),
  createBusiness,
);

router.post(
  "/update/:id",
  passport.authenticate("jwt", { session: false }),
  isOwner,
  upload.single("image"),
  updateBusiness,
);

router.post(
  "/getById/:id",
  passport.authenticate("jwt", { session: false }),
  getBusinessById,
);

module.exports = router;

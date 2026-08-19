const path = require("path");
const fs = require("fs");
const router = require("express").Router();
const multer = require("multer");

const {
  getBusiness,
  createBusiness,
  updateBusiness,
  getBusinessById,
  getWidgetConfig,
} = require("../controllers/business");
const { isOwner } = require("../middleware/permissions");
const { validateBusiness } = require("../middleware/validator");
const { authMiddleware } = require("../middleware/auth");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "..", "uploads", "businesses");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

router.post("/getBusiness", authMiddleware, getBusiness);

router.post(
  "/createBusiness",
  authMiddleware,
  isOwner,
  validateBusiness,
  upload.single("image"),
  createBusiness,
);

router.post(
  "/updateBusiness",
  authMiddleware,
  isOwner,
  upload.single("image"),
  updateBusiness,
);

router.post("/getById/:id", authMiddleware, getBusinessById);

router.post("/getWidgetConfig/:businessId", getWidgetConfig);

module.exports = router;

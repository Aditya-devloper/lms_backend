const fs = require("fs");
const path = require("path");

const router = require("express").Router();
const multer = require("multer");

const {
  uploadKnowledgeDocument,
  testRagQuestion,
  getDocStatus,
  deleteDoc,
} = require("../controllers/rag");
const { authMiddleware } = require("../middleware/auth");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/tmp");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

router.post(
  "/upload-doc",
  authMiddleware,
  upload.single("file"),
  uploadKnowledgeDocument,
);

router.post("/getDocStatus", authMiddleware, getDocStatus);
router.post("/deleteDoc", authMiddleware, deleteDoc);
router.post("/chat", authMiddleware, testRagQuestion);

module.exports = router;

const fs = require("fs");
const path = require("path");

const router = require("express").Router();
const multer = require("multer");
const passport = require("passport");

const {
  triggerCallAgent,
  getCallHistory,
  getCallStats,
} = require("../controllers/callAgent");
const {
  uploadKnowledgeDocument,
  testRagQuestion,
  getDocStatus,
  deleteDoc,
} = require("../controllers/rag");

const uploadDir = path.join(__dirname, "../uploads/tmp");

// Create folder if it doesn't exist

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
  passport.authenticate("jwt", { session: false }),
  upload.single("file"),
  uploadKnowledgeDocument,
);

router.post(
  "/getDocStatus",
  passport.authenticate("jwt", { session: false }),
  getDocStatus,
);

router.post(
  "/deleteDoc",
  passport.authenticate("jwt", { session: false }),
  deleteDoc,
);

router.post(
  "/chat",
  passport.authenticate("jwt", { session: false }),
  testRagQuestion,
);

router.post(
  "/trigger-call",
  passport.authenticate("jwt", { session: false }),
  triggerCallAgent,
);

router.post(
  "/getCallHistory",
  passport.authenticate("jwt", { session: false }),
  getCallHistory,
);

router.post(
  "/getCallStats",
  passport.authenticate("jwt", { session: false }),
  getCallStats,
);

module.exports = router;

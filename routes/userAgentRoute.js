const fs = require("fs");
const path = require("path");

const router = require("express").Router();
const multer = require("multer");

const { authMiddleware } = require("../middleware/auth");
const {
  createAgent,
  getAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  agentLogin,
  getMyAgentProfile,
} = require("../controllers/agent");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/agents");
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
  "/createAgent",
  authMiddleware,
  upload.single("image"),
  createAgent,
);

router.post("/getAgents", authMiddleware, getAgents);
router.post(
  "/updateAgent",
  authMiddleware,
  upload.single("image"),
  updateAgent,
);
router.post("/getAgentById/:id", authMiddleware, getAgentById);
router.post("/deleteAgent/:id", authMiddleware, deleteAgent);

// for agent
router.post("/agentLogin", authMiddleware, agentLogin);
router.post("/getMyAgentProfile", authMiddleware, getMyAgentProfile);

module.exports = router;

const router = require("express").Router();
const multer = require("multer");

const {
  createLead,
  getLeads,
  getLeadById,
  deleteLead,
  updateLead,
  getLeadActivity,
  exportLeads,
  uploadLeads,
} = require("../controllers/lead");
const { validateLead } = require("../middleware/validator");
const { authMiddleware } = require("../middleware/auth");

const upload = multer({
  storage: multer.memoryStorage(),
});

router.post("/getLeads", authMiddleware, getLeads);

router.post("/createLead", authMiddleware, validateLead, createLead);

router.post("/updateLead", authMiddleware, updateLead);

router.post("/getLeadActivity", authMiddleware, getLeadActivity);

router.post("/exportLeads", authMiddleware, exportLeads);

router.post("/uploadLeads", authMiddleware, upload.single("file"), uploadLeads);

router.post("/getById/:id", authMiddleware, getLeadById);

router.post("/deleteLead", authMiddleware, deleteLead);

module.exports = router;

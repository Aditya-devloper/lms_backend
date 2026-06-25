const router = require("express").Router();
const passport = require("passport");
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

const upload = multer({
  storage: multer.memoryStorage(),
});

router.post(
  "/getLeads",
  passport.authenticate("jwt", { session: false }),
  getLeads,
);

router.post(
  "/createLead",
  passport.authenticate("jwt", { session: false }),
  validateLead,
  createLead,
);

router.post(
  "/updateLead",
  passport.authenticate("jwt", { session: false }),
  updateLead,
);

router.post(
  "/getLeadActivity",
  passport.authenticate("jwt", { session: false }),
  getLeadActivity,
);

router.post(
  "/exportLeads",
  passport.authenticate("jwt", { session: false }),
  exportLeads,
);

router.post(
  "/uploadLeads",
  passport.authenticate("jwt", { session: false }),
  upload.single("file"),
  uploadLeads,
);

router.post(
  "/getById/:id",
  passport.authenticate("jwt", { session: false }),
  getLeadById,
);

router.post(
  "/delete/:id",
  passport.authenticate("jwt", { session: false }),
  deleteLead,
);

module.exports = router;

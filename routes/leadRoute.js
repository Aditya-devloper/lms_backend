const router = require("express").Router();
const passport = require("passport");

const {
  createLead,
  getLeads,
  getLeadById,
  deleteLead,
  updateLead,
  getLeadActivity,
} = require("../controllers/lead");
const { validateLead } = require("../middleware/validator");

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

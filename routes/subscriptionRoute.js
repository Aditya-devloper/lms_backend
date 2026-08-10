const router = require("express").Router();
const passport = require("passport");
const {
  createSubscriptionOrder,
  confirmSubscription,
  checkPaymentStatus,
  getAllTransactions,
  exportTransactions,
} = require("../controllers/subscription");

router.post(
  "/getAllTransactions",
  passport.authenticate("jwt", { session: false }),
  getAllTransactions,
);

router.post(
  "/exportTransactions",
  passport.authenticate("jwt", { session: false }),
  exportTransactions,
);

router.post(
  "/create-order",
  passport.authenticate("jwt", { session: false }),
  createSubscriptionOrder,
);

router.post(
  "/confirmSubscription",
  passport.authenticate("jwt", { session: false }),
  confirmSubscription,
);

router.post(
  "/checkPaymentStatus",
  passport.authenticate("jwt", { session: false }),
  checkPaymentStatus,
);

module.exports = router;

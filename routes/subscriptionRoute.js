const router = require("express").Router();
const {
  createSubscriptionOrder,
  confirmSubscription,
  checkPaymentStatus,
  getAllTransactions,
  exportTransactions,
} = require("../controllers/subscription");
const { authMiddleware } = require("../middleware/auth");

router.post("/getAllTransactions", authMiddleware, getAllTransactions);

router.post("/exportTransactions", authMiddleware, exportTransactions);

router.post("/create-order", authMiddleware, createSubscriptionOrder);

router.post("/confirmSubscription", authMiddleware, confirmSubscription);

router.post("/checkPaymentStatus", authMiddleware, checkPaymentStatus);

module.exports = router;

const crypto = require("crypto");
const Razorpay = require("razorpay");

const { json2csv } = require("json-2-csv");
const moment = require("moment");
const csv = require("csv-parser");

const Transaction = require("../models/transactionModel");
const User = require("../models/userModel");
const Business = require("../models/businessModel");

const razorpay = new Razorpay({
  key_id: process.env.RZP_TEST_KEY_ID,
  key_secret: process.env.RZP_TEST_KEY_SECRET,
});

const GST = Number(process.env.GST || 0);

const PLAN_PRICES = {
  INR: {
    monthly: Number(process.env.PREMIUM_PLAN_PRICE_INR_MONTHLY),
    yearly: Number(process.env.PREMIUM_PLAN_PRICE_INR_YEARLY),
  },
  USD: {
    monthly: Number(process.env.PREMIUM_PLAN_PRICE_USD_MONTHLY),
    yearly: Number(process.env.PREMIUM_PLAN_PRICE_USD_YEARLY),
  },
};

function calculateNewPlanDates(business, billing_cycle) {
  const now = new Date();
  const hasActivePlan =
    business.plan?.is_active &&
    business.plan?.end_date &&
    new Date(business.plan.end_date) > now;

  const baseDate = hasActivePlan ? new Date(business.plan.end_date) : now;

  const newEndDate = new Date(baseDate);
  if (billing_cycle === "yearly") {
    newEndDate.setFullYear(newEndDate.getFullYear() + 1);
  } else {
    newEndDate.setMonth(newEndDate.getMonth() + 1);
  }

  const startDate = hasActivePlan ? business.plan.start_date : now;

  return { startDate, endDate: newEndDate };
}

async function generateTransactionId() {
  while (true) {
    const transactionId = `TXN-${crypto.randomInt(
      1000000000,
      10000000000, // upper bound exclusive
    )}`;

    const exists = await Transaction.exists({
      transaction_id: transactionId,
    });

    if (!exists) {
      return transactionId;
    }
  }
}

const createSubscriptionOrder = async (req, res) => {
  try {
    const user = req.user;
    const { currency = "INR", billing_cycle = "monthly" } = req.body;
    const plan_amount = PLAN_PRICES[currency][billing_cycle];

    const plan_gst = Number((plan_amount * GST).toFixed(2));
    const total_amount = Number((plan_amount + plan_gst).toFixed(2));

    const amountInSubunits = total_amount * 100; // amount in the smallest currency unit (paise / cents)

    const order = await razorpay.orders.create({
      amount: amountInSubunits,
      currency,
      receipt: `subscription_rcpt`,
      notes: {
        businessId: user?.business.toString(),
        plan: "premium",
      },
    });

    const transaction_id = await generateTransactionId();

    const transaction = await Transaction.create({
      user: user?._id,
      business: user?.business,
      transaction_id,
      plan: "premium",
      plan_amount,
      plan_gst,
      total_amount,
      currency,
      billing_cycle,
      type: "credit",
      status: "pending",
      order_details: order,
    });

    return res.status(200).json({
      status: true,
      message: "Order created successfully",
      response: order,
    });
  } catch (error) {
    console.error("createSubscriptionOrder error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

async function activatePlan(transaction, payment) {
  if (payment.status !== "captured") {
    transaction.status = "failed";
    transaction.payment_details = payment;
    transaction.notes = `Unexpected payment status: ${payment.status}`;
    await transaction.save();
    return {
      ok: false,
      statusCode: 400,
      message: `Payment not successful, status: ${payment.status}`,
    };
  }

  const expectedAmount = Math.round(transaction.total_amount * 100);
  if (payment.amount !== expectedAmount) {
    transaction.status = "failed";
    transaction.payment_details = payment;
    transaction.notes = `Amount mismatch: expected ${expectedAmount}, got ${payment.amount}`;
    await transaction.save();
    return {
      ok: false,
      statusCode: 400,
      message: "Amount mismatch between order and payment",
    };
  }

  transaction.status = "completed";
  transaction.payment_details = payment;
  if (payment?.fee) {
    transaction.pg_charges = payment.fee / 100;
  }

  const business = await Business.findById(transaction.business);
  if (!business) {
    console.error(
      `Business ${transaction.business} not found while activating plan for transaction ${transaction._id}`,
    );
    return {
      ok: true,
      transaction,
      user: null,
      warning:
        "Payment confirmed, but user business update failed needs manual review",
    };
  }

  const { startDate, endDate } = calculateNewPlanDates(
    business,
    transaction.billing_cycle,
  );

  transaction.start_date = startDate;
  transaction.end_date = endDate;
  transaction.is_active = true;

  business.plan = {
    name: "premium",
    start_date: startDate,
    end_date: endDate,
    billing_cycle: transaction.billing_cycle,
    is_active: true,
  };

  await transaction.save();
  await business.save();

  return { ok: true, transaction, business };
}

const confirmSubscription = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const transaction = await Transaction.findOne({
      "order_details.id": razorpay_order_id,
    });

    if (!transaction) {
      return res.status(404).json({
        status: false,
        message: "Transaction not found for this order_id",
      });
    }

    if (transaction.status === "completed") {
      return res.status(200).json({
        status: true,
        message: "Transaction already confirmed",
        // response: transaction,
      });
    }

    const generated_signature = crypto
      .createHmac("sha256", process.env.RZP_TEST_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      transaction.status = "failed";
      transaction.notes = "Signature verification failed";
      await transaction.save();
      return res.status(400).json({
        status: false,
        message: "Invalid payment signature",
      });
    }

    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    const result = await activatePlan(transaction, payment);

    if (!result.ok) {
      return res
        .status(result.statusCode)
        .json({ status: false, message: result.message });
    }

    return res.status(200).json({
      status: true,
      message:
        result.warning ||
        `Payment conirmed, ${result.user?.plan?.name} plan activated`,
      response: result.user?.plan,
    });
  } catch (error) {
    console.error("confirmSubscription error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

const checkPaymentStatus = async (req, res) => {
  try {
    const { razorpay_order_id } = req.body;

    const transaction = await Transaction.findOne({
      "order_details.id": razorpay_order_id,
    });

    if (!transaction) {
      return res.status(404).json({
        status: false,
        message: "Transaction not found for this order_id",
      });
    }

    if (transaction.status === "completed") {
      return res.status(200).json({
        status: true,
        message: "Transaction already confirmed",
        response: { status: transaction.status },
      });
    }

    // ask Razorpay which payments were attempted against this order
    const { items: payments } =
      await razorpay.orders.fetchPayments(razorpay_order_id);

    const successfulPayment = payments.find((p) => p.status === "captured");

    if (!successfulPayment) {
      return res.status(200).json({
        status: true,
        message: "No successful payment found yet",
        response: { status: transaction.status },
      });
    }

    const result = await activatePlan(transaction, successfulPayment);

    if (!result.ok) {
      return res
        .status(result.statusCode)
        .json({ status: false, message: result.message });
    }

    return res.status(200).json({
      status: true,
      message:
        result.warning ||
        `Payment conirmed, ${result.business?.plan?.name} plan activated`,
      response: { status: transaction.status },
    });
  } catch (error) {
    console.error("checkPaymentStatus error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

const getAllTransactions = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      from,
      to,
      date_type,
      page = 1,
      limit = 10,
      billing_cycle,
      status,
      transaction_id,
      order_id,
      payment_id,
    } = req.body;

    let query = { user: userId };

    if (status) query.status = status;
    if (billing_cycle) query.billing_cycle = billing_cycle;
    if (transaction_id) query.transaction_id = transaction_id;
    if (order_id) query["order_details.id"] = order_id;
    if (payment_id) query["payment_details.id"] = payment_id;

    const now = new Date();

    switch (date_type) {
      case "today": {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        query.createdAt = { $gte: start, $lte: end };
        break;
      }

      case "last30days": {
        const start = new Date();
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        query.createdAt = { $gte: start, $lte: end };
        break;
      }

      case "last60days": {
        const start = new Date();
        start.setDate(start.getDate() - 60);
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        query.createdAt = { $gte: start, $lte: end };
        break;
      }

      case "custom": {
        if (from && to) {
          const toDate = new Date(to);
          toDate.setHours(23, 59, 59, 999);
          query.createdAt = { $gte: new Date(from), $lte: new Date(toDate) };
        }
        break;
      }

      default:
        break;
    }

    const skip = (page - 1) * limit;
    const totalTransactions = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "email");

    return res.status(200).json({
      status: true,
      message: "Transactions retrieved successfully",
      response: {
        transactions,
        totalTransactions,
        page,
        limit,
        totalPages: Math.ceil(totalTransactions / limit),
      },
    });
  } catch (error) {
    console.error("getAllTransactions error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

const exportTransactions = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      status,
      billing_cycle,
      transaction_id,
      from,
      to,
      date_type,
      order_id,
      payment_id,
    } = req.body;

    let query = { user: userId };

    if (status) query.status = status;
    if (billing_cycle) query.billing_cycle = billing_cycle;
    if (transaction_id) query.transaction_id = transaction_id;
    if (order_id) query["order_details.id"] = order_id;
    if (payment_id) query["payment_details.id"] = payment_id;

    const now = new Date();

    switch (date_type) {
      case "today": {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        query.createdAt = { $gte: start, $lte: end };
        break;
      }

      case "last30days": {
        const start = new Date();
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        query.createdAt = { $gte: start, $lte: end };
        break;
      }

      case "last60days": {
        const start = new Date();
        start.setDate(start.getDate() - 60);
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        query.createdAt = { $gte: start, $lte: end };
        break;
      }

      case "custom": {
        if (from && to) {
          const toDate = new Date(to);
          toDate.setHours(23, 59, 59, 999);
          query.createdAt = { $gte: new Date(from), $lte: new Date(toDate) };
        }
        break;
      }

      default:
        break;
    }

    const transactions = await Transaction.find(query)
      .populate("user", "email")
      .sort({ createdAt: -1 });

    // console.log("exports transactions:", transactions);

    const transactionsData = transactions.map((transaction) => ({
      TransactionID: transaction?.transaction_id || "",
      PaymentID: transaction?.payment_details?.id || "",
      // Name: transaction.user?.name || "",
      Plan: transaction?.plan || "",
      Amount: transaction?.plan_amount || 0,
      currency: transaction.currency || "",
      BillingCycle: transaction?.billing_cycle || "",
      Status: transaction?.status || "",
      "Created At": moment(transaction?.createdAt).format("DD MMM YYYY"),
    }));

    const csvData = await json2csv(transactionsData);

    console.log("exports csvData:", csvData);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=transactions_${Date.now()}.csv`,
    );

    return res.send(csvData);
  } catch (error) {
    console.log("exportTransactions error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

module.exports = {
  createSubscriptionOrder,
  confirmSubscription,
  checkPaymentStatus,
  getAllTransactions,
  exportTransactions,
};

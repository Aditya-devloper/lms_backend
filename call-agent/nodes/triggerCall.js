const Business = require("../../models/businessModel");
const CallHistory = require("../../models/callHistoryModel");

const CALLE_INTERNAL_COST = Number(process.env.CALLE_INTERNAL_COST) || 0.05;

const CALL_RESULT_SCHEMA = {
  type: "object",
  required: ["interested", "lead_score"],
  properties: {
    interested: {
      type: "string",
      enum: ["yes", "no", "maybe"],
      description: "Did the lead show genuine interest in what was offered?",
    },

    lead_score: {
      type: "string",
      enum: ["hot", "warm", "cold"],
      description:
        "hot = clearly interested AND has budget/timeline AND ready to move forward soon. " +
        "warm = interested but unclear on budget/timeline, or needs more time/info. " +
        "cold = not interested, or no realistic budget/intent.",
    },

    requirement_summary: {
      type: "string",
      description:
        "One short sentence on what the lead is looking for, in their own context (works for any industry — property type, service needed, product interest, etc).",
    },

    budget_mentioned: {
      type: "string",
      description:
        "Any budget, price range, or spending capacity the lead mentioned. Use 'not discussed' if not brought up.",
    },

    timeline: {
      type: "string",
      enum: [
        "immediate",
        "within_month",
        "within_quarter",
        "not_sure",
        "no_timeline",
      ],
      description: "How soon the lead wants to move forward.",
    },

    preferred_followup: {
      type: "string",
      description:
        "Day/time the lead prefers for a follow-up call or visit, if mentioned.",
    },

    objection_reason: {
      type: "string",
      description:
        "If not interested, the main reason given. Empty if interested.",
    },
  },
};

const triggerCall = async (state) => {
  console.log("triggerCall node comes");
  const { CalleClient } = await import("@call-e/calle");
  const client = new CalleClient({ apiKey: process.env.CALLE_API_KEY });

  const idempotencyKey = `${state.requestId}:attempt-${state.attemptNumber}`;

  let call;
  try {
    call = await client.calls.createAndWait(
      {
        task: state.taskText,
        resultSchema: CALL_RESULT_SCHEMA,
      },
      { idempotencyKey },
    );
  } catch (error) {
    console.log(
      "triggerCall => call was never dialed, no charge applied:",
      error.message,
    );
    return {
      callResult: null,
      callStatus: "rejected",
    };
  }

  console.log("triggerCall =>", call);
  console.log("triggerCall =>", call.structuredResult);

  const callStatus =
    call.status === "completed" ? "completed" : call.error?.code || "failed";

  const wasCharged = callStatus === "completed";

  if (wasCharged) {
    await Business.findByIdAndUpdate(state.leadData.business, {
      $inc: { call_balance: -1 },
    });
  }

  await CallHistory.create({
    lead: state.leadId,
    business: state.leadData.business,
    triggered_by: state.leadData.created_by,
    task_text: state.taskText,
    call_status: callStatus,
    call_result: call.structuredResult,
    internal_cost: wasCharged ? CALLE_INTERNAL_COST : 0,
    was_charged: wasCharged,
    attempt_number: state.attemptNumber,
    request_id: state.requestId,
  });

  return {
    callResult: call.structuredResult,
    callStatus,
  };
};

module.exports = { triggerCall };

const Business = require("../../models/businessModel");
const CallHistory = require("../../models/callHistoryModel");

const CALL_COST = Number(process.env.CALL_COST) || 0.06;

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
        resultSchema: {
          type: "object",
          required: ["interested"],
          properties: {
            interested: { type: "string", enum: ["yes", "no", "maybe"] },
            preferred_day: { type: "string" },
          },
        },
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
      $inc: { call_credits: -CALL_COST },
    });
  }

  await CallHistory.create({
    lead: state.leadId,
    business: state.leadData.business,
    triggered_by: state.leadData.created_by,
    task_text: state.taskText,
    call_status: callStatus,
    call_result: call.structuredResult,
    cost_charged: wasCharged ? CALL_COST : 0,
    attempt_number: state.attemptNumber,
    request_id: state.requestId,
  });

  return {
    callResult: call.structuredResult,
    callStatus,
  };
};

module.exports = { triggerCall };

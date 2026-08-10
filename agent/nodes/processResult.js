const Lead = require("../../models/leadModel");
const LeadActivity = require("../../models/leadActivityModel");
const chrono = require("chrono-node");

const parsePreferredDay = (text) => {
  if (!text) return null;

  const parsedDate = chrono.parseDate(text, new Date(), { forwardDate: true });
  // forwardDate: true —  date ko hamesha future mein resolve karega, past mein nahi

  return parsedDate || null;
};

const processResult = async (state) => {
  console.log("processResult node comes");
  await Lead.findByIdAndUpdate(state.leadId, {
    last_call_at: new Date(),
    last_call_status: state.callStatus,
    last_call_result: state.callResult,
    $inc: { call_attempts: 1 },
  });

  const lead = await Lead.findById(state.leadId);

  await LeadActivity.create({
    lead: state.leadId,
    business: lead.business,
    created_by: lead.created_by, // AI ne trigger kiya, but account-owner ke against attribute karte
    activity_type: "ai_call_completed",
    description:
      state.callStatus === "completed"
        ? "AI agent completed a call with this lead"
        : `AI agent's call attempt ${state.callStatus === "failed" ? "failed" : "went unanswered"}`,
    metadata: {
      callStatus: state.callStatus,
      interested: state.callResult?.interested || null,
      preferredDay: state.callResult?.preferred_day || null,
      attemptNumber: state.attemptNumber,
    },
  });

  return {};
};

const incrementAttempt = async (state) => ({
  attemptNumber: state.attemptNumber + 1,
});

const markInterested = async (state) => {
  console.log("markInterested node comes");
  const lead = await Lead.findById(state.leadId);
  const previousStatus = lead.status;
  const previousFollowUp = lead.follow_up_date;

  lead.status = "interested";

  const preferredDate = parsePreferredDay(state.callResult?.preferred_day);
  if (preferredDate) lead.follow_up_date = preferredDate;

  await lead.save();

  await LeadActivity.create({
    lead: state.leadId,
    business: lead.business,
    created_by: lead.created_by,
    activity_type: "status_changed",
    description: `Status changed to "interested" based on AI call outcome${
      preferredDate && ` — lead prefers ${state.callResult.preferred_day}`
    }`,
    metadata: {
      from: previousStatus,
      to: "interested",
      ...(preferredDate && {
        followUpFrom: previousFollowUp,
        followUpTo: preferredDate,
      }),
    },
  });

  return {};
};

const markNotInterested = async (state) => {
  console.log("markNotInterested node comes");
  const lead = await Lead.findById(state.leadId);
  const previousStatus = lead.status;

  lead.status = "lost";
  await lead.save();

  await LeadActivity.create({
    lead: state.leadId,
    business: lead.business,
    created_by: lead.created_by,
    activity_type: "status_changed",
    description: `Status changed to "lost" — AI call indicated no interest`,
    metadata: { from: previousStatus, to: "lost" },
  });

  return {};
};

const scheduleFollowup = async (state) => {
  console.log("scheduleFollowup node comes");
  const lead = await Lead.findById(state.leadId);
  const previousStatus = lead.status;
  const previousFollowUp = lead.follow_up_date;

  // Pehle try karo lead ne khud jo din bola usko use karna
  let followUpDate = parsePreferredDay(state.callResult?.preferred_day);
  let source = "lead_stated";

  // Agar lead ne koi specific din nahi bola, ya parse nahi ho paya — tabhi default fallback
  if (!followUpDate) {
    followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 3);
    source = "default_fallback";
  }

  lead.status = "contacted";
  lead.follow_up_date = followUpDate;
  await lead.save();

  await LeadActivity.create({
    lead: state.leadId,
    business: lead.business,
    created_by: lead.created_by,
    activity_type: "followup_added",
    description:
      source === "lead_stated"
        ? `Follow-up scheduled based on lead's preference ("${state.callResult.preferred_day}")`
        : `Default Follow-up scheduled (lead didn't give a clear date)`,
    metadata: { from: previousFollowUp, to: followUpDate, source },
  });

  return {};
};

module.exports = {
  processResult,
  markInterested,
  markNotInterested,
  scheduleFollowup,
  incrementAttempt,
};

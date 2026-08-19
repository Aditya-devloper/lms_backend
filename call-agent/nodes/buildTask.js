const { getModel } = require("../../shared/llmModel");
const { getBusinessContext } = require("../../controllers/business");

const buildTask = async (state) => {
  console.log("buildTask node comes");
  const model = await getModel();
  const { leadData, retrievedContext, userContext } = state;

  if (!leadData?.phone) {
    throw new Error(
      `Lead ${leadData?._id} has no phone number — cannot build call task`,
    );
  }

  const business = await getBusinessContext(leadData?.business);

  const prompt = `You are writing call instructions for an AI calling agent representing ${business.name}${
    business.type ? `, a ${business.type} business` : ""
  }.
  
  Recipient phone number (E.164 format, MUST be included exactly as given): ${leadData.phone}
  Lead name: ${leadData.name}
  Lead notes: ${leadData.notes || "none"}
  Business context: ${retrievedContext.join("\n") || "none"}
  ${userContext ? `\nSpecific instruction from the business owner for THIS call (high priority — follow this closely): ${userContext}\n` : ""}
  
  Write a short, natural "task" instruction (2-3 sentences) telling the calling agent
  who to call and what to say/ask. ${userContext ? "Incorporate the business owner's specific instruction, while staying consistent with the business context." : "Focus on qualifying interest and confirming a next step."}
  
  The agent should naturally try to learn: what the lead is looking for, their budget or
  spending capacity (if it comes up naturally — don't interrogate), and how soon they want
  to move forward. This helps score the lead accurately afterward.
  
  MANDATORY — the task text MUST explicitly instruct the agent to introduce itself as
  calling on behalf of "${business.name}". Never omit this, even when a specific
  instruction is given above — the caller must always state who they're calling from.
  
  If the business context doesn't have specific info the lead might ask about, instruct the
  agent to acknowledge that naturally and offer to have a team member follow up with details,
  rather than making anything up.
  
  The instruction MUST start with:
  "Call ${leadData.phone} and introduce yourself as calling from ${business.name}, then ..."
  Return ONLY the task text, nothing else.`;

  const response = await model.invoke(prompt);

  if (!response.content.includes(leadData?.phone)) {
    throw new Error(
      `buildTask: generated task text is missing the phone number (${leadData?.phone}). Aborting to avoid a broken/wasted call.`,
    );
  }

  console.log("buildTask response =>", response?.content);
  return { taskText: response?.content };
};

module.exports = { buildTask };

const { parsePhoneNumberFromString } = require("libphonenumber-js");

const { getModel } = require("../../shared/llmModel");
const Conversation = require("../../models/conversationModel");
const Lead = require("../../models/leadModel");
const Business = require("../../models/businessModel");

const FALLBACK_COUNTRY = "IN";

const normalizePhone = (rawPhone, country) => {
  if (!rawPhone) return null;

  const parsed = parsePhoneNumberFromString(
    rawPhone,
    country || FALLBACK_COUNTRY,
  );

  if (!parsed || !parsed.isValid()) {
    return null;
  }

  return parsed.format("E.164");
};

const extractAndUpdateLead = async (state) => {
  console.log("extractAndUpdateLead node comes");
  const model = await getModel();

  const prompt = `Extract any of the following from this message if present. Return ONLY valid JSON, no other text.
    If something isn't mentioned, use an empty string "" for it. Don't guess or invent values.

    Message: "${state.userMessage}"

    JSON format:
    {
    "requirement_summary": "",
    "budget_mentioned": "",
    "timeline": "",
    "visitor_name": "",
    "visitor_phone": "",
    "visitor_email": "",
    "visitor_country_code": ""
    }   

    For visitor_country_code: if the visitor mentions their country (by name, e.g. "USA", "India",
    "UK") or you can infer it, return its ISO 3166-1 alpha-2 code (e.g. "IN", "US", "GB", "AE").
    Leave empty if not mentioned.
    `;

  let extracted;
  try {
    const response = await model.invoke(prompt);
    const cleaned = response.content.replace(/```json|```/g, "").trim();
    extracted = JSON.parse(cleaned);
  } catch (err) {
    console.log(
      "extractAndUpdateLead: extraction failed, skipping this turn:",
      err.message,
    );
    return {}; // extraction fail hui to bhi chat chalte rehna chahiye, ye non-critical path hai
  }

  const conversation = await Conversation.findById(state.conversationId);

  if (extracted.requirement_summary)
    conversation.qualification.requirement_summary =
      extracted.requirement_summary;
  if (extracted.budget_mentioned)
    conversation.qualification.budget_mentioned = extracted.budget_mentioned;
  if (extracted.timeline)
    conversation.qualification.timeline = extracted.timeline;
  if (extracted.visitor_name)
    conversation.visitor_name = extracted.visitor_name;
  if (extracted.visitor_phone)
    conversation.visitor_phone = extracted.visitor_phone;
  if (extracted.visitor_email)
    conversation.visitor_email = extracted.visitor_email;

  if (
    extracted.visitor_country_code &&
    extracted.visitor_country_code.length === 2
  ) {
    conversation.visitor_country = extracted.visitor_country_code.toUpperCase();
  }

  const countryToUse = conversation.visitor_country || undefined;
  let phoneNeedsClarification = false;

  if (extracted.visitor_phone) {
    const normalized = normalizePhone(extracted.visitor_phone);
    if (normalized) {
      conversation.visitor_phone = normalized;
    } else {
      console.log(
        `extractAndUpdateLead: could not parse phone "${extracted.visitor_phone}" — asking for clarification`,
      );
      conversation.pending_raw_phone = extracted.visitor_phone;
      phoneNeedsClarification = true;
    }
  } else if (extracted.visitor_country_code && conversation.pending_raw_phone) {
    const retryNormalized = normalizePhone(
      conversation.pending_raw_phone,
      countryToUse,
    );
    if (retryNormalized) {
      console.log(
        `extractAndUpdateLead: pending phone resolved using country ${countryToUse}`,
      );
      conversation.visitor_phone = retryNormalized;
      conversation.pending_raw_phone = "";
    } else {
      phoneNeedsClarification = true;
    }
  }

  await conversation.save();

  // lead create
  if (
    !conversation.lead &&
    (conversation.visitor_phone || conversation.visitor_email)
  ) {
    const business = await Business.findById(state.businessId);
    const fallbackUserId = business.owner;

    const lead = await Lead.create({
      created_by: fallbackUserId,
      business: state.businessId,
      name: conversation.visitor_name || "Website Visitor",
      email: conversation.visitor_email || "",
      phone: conversation.visitor_phone || "",
      notes: `[Website Chat] Requirement: ${conversation.qualification.requirement_summary || "N/A"}. Budget: ${conversation.qualification.budget_mentioned || "N/A"}. Timeline: ${conversation.qualification.timeline || "N/A"}.`,
      status: "new",
      source: "website",
      follow_up_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // default: kal follow-up
      assigned_to: fallbackUserId,
      type: "ai_agent",
    });

    conversation.lead = lead._id;
    await conversation.save();

    console.log(`New lead created from chat: ${lead._id}`);
  }

  return { phoneNeedsClarification };
};

module.exports = { extractAndUpdateLead };

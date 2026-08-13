const Lead = require("../../models/leadModel");

const fetchLead = async (state) => {
  console.log("fetchLead node comes response");

  const lead = await Lead.findById(state.leadId);
  if (!lead) throw new Error("Lead not found: " + state.leadId);
  return { leadData: lead };
};

module.exports = { fetchLead };

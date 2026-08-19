const Business = require("../models/Business");

const checkModuleUsage = async (businessId, moduleType) => {
  const business = await Business.findById(businessId);

  if (!business) {
    return { allowed: false, reason: "business_not_found" };
  }

  const module = business.modules.find((m) => m.type === moduleType);

  if (!module || !module.is_active) {
    return { allowed: false, reason: "module_not_enabled", business };
  }

  const now = new Date();
  if (module.end_date && module.end_date < now) {
    return { allowed: false, reason: "module_expired", business };
  }

  const includedRemaining = module.included_quota - module.used_quota;
  const hasIncluded = includedRemaining > 0;
  const hasTopUp = module.top_up_balance > 0;

  if (!hasIncluded && !hasTopUp) {
    return { allowed: false, reason: "quota_exhausted", business };
  }

  return { allowed: true, business, module, usingTopUp: !hasIncluded };
};

const consumeModuleUsage = async (businessId, moduleType, amount = 1) => {
  const business = await Business.findById(businessId);
  const module = business.modules.find((m) => m.type === moduleType);

  if (!module) return;

  const includedRemaining = module.included_quota - module.used_quota;

  if (includedRemaining >= amount) {
    module.used_quota += amount; // pehle included quota se consume karo
  } else {
    module.top_up_balance = Math.max(0, module.top_up_balance - amount); // fir top-up se
  }

  await business.save();
};

const checkPlanLimit = async (businessId, limitType, currentCount) => {
  const business = await Business.findById(businessId);
  const limit = business.plan[limitType]; // e.g. "lead_limit", "agent_limit"

  if (currentCount >= limit) {
    return { allowed: false, reason: `${limitType}_reached`, limit };
  }

  return { allowed: true };
};

module.exports = { checkModuleUsage, consumeModuleUsage, checkPlanLimit };

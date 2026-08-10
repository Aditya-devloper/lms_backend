const MAX_ATTEMPTS = 2;

const decideNextStep = (state) => {
  const { callStatus, callResult, attemptNumber } = state;

  if (callStatus === "rejected") {
    return "end";
  }

  if (callStatus === "no_answer" || callStatus === "failed") {
    if (attemptNumber < MAX_ATTEMPTS) {
      return "retry";
    }
    return "end";
  }

  if (callStatus === "completed" && callResult) {
    if (callResult.interested === "yes") {
      return "mark_interested";
    }
    if (callResult.interested === "no") {
      return "mark_not_interested";
    }
    return "schedule_followup";
  }

  return "end";
};

module.exports = { decideNextStep };

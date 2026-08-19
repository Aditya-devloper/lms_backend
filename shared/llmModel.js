const { ChatGroq } = require("@langchain/groq");
const { ChatAnthropic } = require("@langchain/anthropic");

let cachedModel = null;

const getModel = async () => {
  if (cachedModel) return cachedModel;

  const provider = process.env.LLM_PROVIDER || "groq";

  if (provider === "groq") {
    cachedModel = new ChatGroq({
      model: "openai/gpt-oss-120b",
      temperature: 0.3,
      // maxTokens: undefined,
      maxRetries: 2,
    });
  } else if (provider === "anthropic") {
    cachedModel = new ChatAnthropic({
      model: "claude-sonnet-4-6",
      temperature: 0.3,
    });
  } else {
    throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
  }

  return cachedModel;
};

module.exports = { getModel };

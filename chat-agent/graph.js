const { StateGraph } = require("@langchain/langgraph");
const { loadConversation } = require("./nodes/loadConversation");
const { retrieveContext } = require("./nodes/retrieveContext");
const { generateResponse } = require("./nodes/generateResponse");
const { extractAndUpdateLead } = require("./nodes/extractAndUpdateLead");
const { saveMessage } = require("./nodes/saveMessage");
const { getStateAnnotation } = require("./state");
const { ChatState } = require("./state");

const workflow = new StateGraph(ChatState)
  .addNode("loadConversation", loadConversation)
  .addNode("extractAndUpdateLead", extractAndUpdateLead)
  .addNode("retrieveContext", retrieveContext)
  .addNode("generateResponse", generateResponse)
  .addNode("saveMessage", saveMessage)

  .addEdge("__start__", "loadConversation")
  .addEdge("loadConversation", "extractAndUpdateLead")
  .addEdge("extractAndUpdateLead", "retrieveContext")
  .addEdge("retrieveContext", "generateResponse")
  .addEdge("generateResponse", "saveMessage")
  .addEdge("saveMessage", "__end__");

const graph = workflow.compile();

module.exports = { graph };

const createCall = async (req, res) => {
  try {
    console.log("Call initiated");
    const { CalleClient } = await import("@call-e/calle");

    const client = new CalleClient({
      apiKey: process.env.CALLE_API_KEY,
    });

    if (!client)
      return res
        .status(500)
        .json({ status: false, message: "Client not found" });

    console.log("Client initiated");

    const { phone } = req.body;

    const call = await client.calls.createAndWait({
      task: `Call +91${phone} and ask whether they can hear clearly.`,
      resultSchema: {
        type: "object",
        required: ["can_hear_clearly"],
        properties: {
          can_hear_clearly: { type: "string", enum: ["yes", "no", "unknown"] },
        },
      },
    });

    console.log(call.status);
    console.log(call.structuredResult);
    console.log(call.taskCompleted, call.completionConfidence, call.evidence);

    return res
      .status(200)
      .json({ status: true, message: "Call sent", response: call });
  } catch (error) {
    console.log("createCall =>", error);

    return res.json({ status: false, message: error.message });
  }
};

module.exports = { createCall };

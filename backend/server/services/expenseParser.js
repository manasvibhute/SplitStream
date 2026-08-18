const Groq = require("groq-sdk");
const AnthropicModule = require("@anthropic-ai/sdk");

const Anthropic = AnthropicModule.default || AnthropicModule;

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const GROQ_FALLBACK_MODELS = [];

function stripJsonFence(rawText) {
  if (typeof rawText !== "string") {
    return "";
  }

  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  return cleaned;
}

function validateParseRequest(text, groupMembers) {
  if (!text || !String(text).trim()) {
    return "Expense text is required.";
  }

  if (String(text).length > 300) {
    return "Expense text must be 300 characters or fewer.";
  }

  if (!Array.isArray(groupMembers)) {
    return "groupMembers must be an array.";
  }

  return null;
}

async function parseExpenseText({ text, groupMembers, currentUserId }) {

  const groqKey = process.env.GROQ_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!groqKey && !anthropicKey) {
    const error = new Error(
      "AI API key is not configured. Set GROQ_API_KEY."
    );

    error.statusCode = 502;

    throw error;
  }

  const memberList = groupMembers.map(member => ({
    id: member.id,
    name: member.name
  }));

  console.log("CURRENT USER ID:", currentUserId);
  console.log("GROUP MEMBERS:", memberList);

  if (groqKey) {
    return parseExpenseTextWithGroq({
      text,
      memberList,
      currentUserId,
      apiKey: groqKey
    });
  }

  return parseExpenseTextWithAnthropic({
    text,
    memberList,
    apiKey: anthropicKey
  });
}

async function parseExpenseTextWithGroq({
  text,
  memberList,
  currentUserId,
  apiKey
}) {

  const client = new Groq({
    apiKey
  });

  const prompt = `
You are an expense parser.

Convert the expense into JSON.

IMPORTANT RULES:

1. Use ONLY participant IDs from groupMembers.
2. NEVER invent IDs.
3. NEVER replace an unknown person with an existing member.
4. If the expense mentions a person who is NOT in groupMembers:
   - participants must be []
   - paidBy must be null
   - splitType must be "unclear"
   - splitAmounts must be {}
   - confidence must be "low"
   - include that person's name in unknownParticipants.
5. The payer (paidBy) MUST always be included in participants.
6. Return ONLY valid JSON.

Return exactly:

{
  "amount": number,
  "description": "string",
  "participants": ["participant ids"],
  "paidBy": "participant id or null",
  "splitType": "equal|unequal|unclear",
  "splitAmounts": {
    "participant id": number
  },
  "confidence": "high|low",
  "unknownParticipants": ["string"]
}

RULES FOR splitAmounts:

- If splitType is "equal":
  splitAmounts must be {}.

- If splitType is "unequal":
  splitAmounts MUST contain an amount for EVERY participant.

- Values in splitAmounts MUST sum exactly to amount.

- If one participant has a stated amount and the payer covers "the rest",
  assign the remaining amount to the payer.

Example:

Expense:
"Paid 350 for dinner, Manasvi owes 60, rest is mine."

Result:
{
  "amount":350,
  "description":"Dinner",
  "participants":["abc","manasvi"],
  "paidBy":"abc",
  "splitType":"unequal",
  "splitAmounts":{
      "abc":290,
      "manasvi":60
  },
  "confidence":"high",
  "unknownParticipants":[]
}

Group Members:
${JSON.stringify(memberList)}

Current user ID:
${currentUserId}

IMPORTANT:
- "I", "me", "my", and "mine" always refer to the current user.
- When the expense says "me", use the current user's ID.
- When the expense says "I paid", set paidBy to the current user's ID.
- When the expense says "me and X", include the current user's ID and X's ID in participants.

Expense:
${text}
`;

  const modelCandidates = [GROQ_MODEL];
  const seenModels = new Set();

  let lastError = null;

  for (const modelName of modelCandidates) {
    if (seenModels.has(modelName)) {
      continue;
    }
    seenModels.add(modelName);

    try {
      const completion = await client.chat.completions.create({
        model: modelName,
        temperature: 0.6,
        include_reasoning: false,
        response_format: {
          type: "json_object"
        },
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

      const raw = stripJsonFence(completion.choices[0].message.content);

      console.log("Groq raw:");
      console.log(raw);

      return normalizeParsedExpense(
        JSON.parse(raw),
        memberList
      );
    } catch (error) {
      lastError = error;
      console.warn(`Groq model failed: ${modelName}`, error.message || error);
      if (error?.status === 404 || error?.statusCode === 404 || error?.message?.includes("does not exist")) {
        continue;
      }
      break;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("No Groq model could parse the expense.");
}

async function parseExpenseTextWithAnthropic({
  text,
  memberList,
  apiKey,
}) {
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 500,
    temperature: 0,
    system: `
You parse natural-language shared expense entries into JSON.

Return ONLY valid JSON.

Return exactly:

{
  "amount": number,
  "description": "string",
  "participants": ["participant ids"],
  "paidBy": "participant id or null",
  "splitType": "equal|unequal|unclear",
  "splitAmounts": {
    "participant id": number
  },
  "confidence": "high|low",
  "unknownParticipants": ["string"]
}

Rules:

- Use ONLY participant ids provided in groupMembers.
- Never invent ids.
- paidBy MUST always appear in participants.
- If splitType is "equal", splitAmounts must be {}.
- If splitType is "unequal", splitAmounts must contain every participant's amount.
- splitAmounts values must sum exactly to amount.
- If one person's share is explicitly given and the payer pays the remaining amount, assign the remainder to the payer.
`,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          text,
          groupMembers: memberList,
        }),
      },
    ],
  });

  const rawText =
    message.content.find((p) => p.type === "text")?.text || "";

  console.log("Claude raw:");
  console.log(rawText);

  return normalizeParsedExpense(
    JSON.parse(rawText),
    memberList
  );
}

function normalizeParsedExpense(parsed, groupMembers) {
  const memberIds = new Set(
    groupMembers.map((member) => String(member.id))
  );

  const participants = Array.isArray(parsed.participants)
    ? parsed.participants
      .map(String)
      .filter((id) => memberIds.has(id))
    : [];

  const paidBy =
    parsed.paidBy && memberIds.has(String(parsed.paidBy))
      ? String(parsed.paidBy)
      : null;

  // Always include payer
  if (paidBy && !participants.includes(paidBy)) {
    participants.push(paidBy);
  }

  const splitType = ["equal", "unequal", "unclear"].includes(
    parsed.splitType
  )
    ? parsed.splitType
    : "unclear";

  const splitAmounts = {};

  if (
    splitType === "unequal" &&
    parsed.splitAmounts &&
    typeof parsed.splitAmounts === "object"
  ) {
    for (const id of participants) {
      const value = Number(parsed.splitAmounts[id]);

      if (Number.isFinite(value)) {
        splitAmounts[id] = value;
      }
    }
  }

  const confidence =
    parsed.confidence === "high" ? "high" : "low";

  return {
    amount: Number.isFinite(Number(parsed.amount))
      ? Number(parsed.amount)
      : null,
    description:
      typeof parsed.description === "string"
        ? parsed.description
        : "",
    participants,
    paidBy,
    splitType,
    splitAmounts,
    confidence,
    unknownParticipants: Array.isArray(parsed.unknownParticipants)
      ? parsed.unknownParticipants
      : [],
  };
}

module.exports = {
  parseExpenseText,
  validateParseRequest,
  normalizeParsedExpense,
};
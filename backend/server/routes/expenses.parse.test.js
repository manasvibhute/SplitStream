const express = require("express");
const request = require("supertest");

const mockCreate = jest.fn();

jest.mock("@anthropic-ai/sdk", () =>
  jest.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  }))
);

jest.mock("../utils/tokens", () => ({
  verifyAccessToken: jest.fn(() => ({ sub: "user-1", email: "test@example.com" })),
}));

const expenseRoutes = require("./expenses");

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", expenseRoutes);
  app.use((error, _req, res, _next) => {
    res.status(error.statusCode || 500).json({ message: error.message });
  });
  return app;
}

const groupMembers = [
  { id: "user-1", name: "Manasvi" },
  { id: "user-2", name: "Priya" },
  { id: "user-3", name: "Rahul" },
];

describe("POST /api/expenses/parse", () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockCreate.mockReset();
  });

  test("parses valid natural-language expense input", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            amount: 500,
            description: "dinner",
            participants: ["user-2", "user-3"],
            paidBy: null,
            splitType: "equal",
            confidence: "high",
          }),
        },
      ],
    });

    const response = await request(createApp())
      .post("/api/expenses/parse")
      .set("Authorization", "Bearer token")
      .send({ text: "Paid 500 for dinner with Priya and Rahul", groupMembers });

    expect(response.status).toBe(200);
    expect(response.body.needsClarification).toBe(false);
    expect(response.body.parsed).toEqual({
      amount: 500,
      description: "dinner",
      participants: ["user-2", "user-3"],
      paidBy: null,
      splitType: "equal",
      confidence: "high",
    });
  });

  test("returns clarification response for low-confidence unclear input", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            amount: null,
            description: "",
            participants: [],
            paidBy: null,
            splitType: "unclear",
            confidence: "low",
          }),
        },
      ],
    });

    const response = await request(createApp())
      .post("/api/expenses/parse")
      .set("Authorization", "Bearer token")
      .send({ text: "settled that thing yesterday", groupMembers });

    expect(response.status).toBe(200);
    expect(response.body.needsClarification).toBe(true);
    expect(response.body.parsed.confidence).toBe("low");
    expect(response.body.parsed.splitType).toBe("unclear");
  });

  test("strips markdown code fences before JSON parsing", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: "```json\n{\n  \"amount\": 2100,\n  \"description\": \"Dinner\",\n  \"participants\": [\"user-1\", \"user-2\", \"user-3\"],\n  \"paidBy\": \"user-1\",\n  \"splitType\": \"equal\",\n  \"splitAmounts\": {},\n  \"confidence\": \"high\",\n  \"unknownParticipants\": []\n}\n```",
        },
      ],
    });

    const response = await request(createApp())
      .post("/api/expenses/parse")
      .set("Authorization", "Bearer token")
      .send({ text: "Rida paid 2100 for dinner, split equally between Rida, ABC, and Manasvi", groupMembers });

    expect(response.status).toBe(200);
    expect(response.body.parsed).toMatchObject({
      amount: 2100,
      description: "Dinner",
      paidBy: "user-1",
      splitType: "equal",
      confidence: "high",
      participants: ["user-1", "user-2", "user-3"],
    });
  });

  test("rejects empty text", async () => {
    const response = await request(createApp())
      .post("/api/expenses/parse")
      .set("Authorization", "Bearer token")
      .send({ text: "   ", groupMembers });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/required/i);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test("returns 502 when Anthropic API fails", async () => {
    mockCreate.mockRejectedValue(new Error("api unavailable"));

    const response = await request(createApp())
      .post("/api/expenses/parse")
      .set("Authorization", "Bearer token")
      .send({ text: "Paid 500 for dinner with Priya", groupMembers });

    expect(response.status).toBe(502);
    expect(response.body.message).toMatch(/manual form/i);
  });
});

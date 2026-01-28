import express from "express";
import { GoogleGenAI } from "@google/genai";
import jwt from "jsonwebtoken";

const router = express.Router()
const ai = new GoogleGenAI({})

router.post("/respond", authenticateToken, async (req, res) => {
  try {
    const query = req.body.query

    if (!query) {
      return res.status(400).send({ message: "No query sent" })
    }

    const formattedContext = req.body.context.map(pair => pair
      .map(message => `${message.role === "user" ? "User" : "Assistant"} : ${message.message}`))
      .join("\\n")

    console.log(formattedContext)

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: `You are an AI learning assistant.

Respond to the user's query using markup formatting (Markdown-style) based on the given context.

STRICT OUTPUT RULES:
- Do NOT use actual line breaks.
- All new lines MUST be represented using the literal sequence "\\n".
- Do NOT output raw HTML.
- Do NOT include code fences unless explicitly requested.
- The entire response must be wrapped exactly like this:

---\\n\\n{response}\\n\\n---

- The opening and closing "---" must be included exactly.
- There must be exactly two "\\n" after the opening "---" and before the closing "---".
- Do not include anything before or after the wrapper.

Context: ${formattedContext}

User query: "${query}"

Generate the response now.
`
    })

    res.status(200).send({ message: response })
  } catch (err) {
    console.log(err)
    res.status(500).send({ message: "Server Error" })
  }
})

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

export default router

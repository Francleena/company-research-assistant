import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_KEY) {
    console.error("❌ ERROR: Missing OPENROUTER_API_KEY in .env");
    process.exit(1);
}

async function fetchWikipediaSummary(company) {
    const title = encodeURIComponent(company);
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=true&explaintext=true&titles=${title}&redirects=1`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.query?.pages) return null;

    const page = Object.values(data.query.pages)[0];
    return page?.extract || null;
}

app.post("/api/company", async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: "Company name required" });

        const wiki = await fetchWikipediaSummary(name) || "No Wikipedia summary available.";

        const system = `
You are an assistant that generates concise account plans for sales/partnership teams.
Sections: Overview, Key Products/Services, Market & Competitors, Strengths & Weaknesses,
Potential Opportunities, Risks/Concerns, Suggested Next Steps (3 action items).
Keep each section short (2–5 sentences).
`;

        const userPrompt = `
Company: ${name}

Use this text to produce a professional account plan:
${wiki}

If info is missing, mark assumptions clearly.
`;

        const openrouterResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_KEY}`,
                "Content-Type": "application/json",

                // Recommended by OpenRouter (prevents some errors)
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Account Planner",
            },
            body: JSON.stringify({
                model: "deepseek/deepseek-chat",
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: userPrompt }
                ],
                max_tokens: 700,
                temperature: 0.2
            })
        });

        // Log full error if status != 200
        if (!openrouterResp.ok) {
            const errText = await openrouterResp.text();
            console.error("❌ OpenRouter error response:", errText);
            return res.status(500).json({
                error: "OpenRouter API error",
                detail: errText
            });
        }

        const data = await openrouterResp.json();
        const assistantMsg = data.choices?.[0]?.message?.content || "";

        return res.json({ wiki, plan: assistantMsg });

    } catch (err) {
        console.error("❌ Server error:", err);
        res.status(500).json({ error: "Server error", detail: err.message });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

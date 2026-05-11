import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(join(__dirname, "public")));

const SYSTEM_PROMPT =
  "Kamu adalah Tovi, asisten travel AI yang ramah dan antusias. " +
  "Kamu ahli dalam merekomendasikan destinasi wisata, merencanakan itinerary, " +
  "memberikan tips perjalanan (budget, transportasi, akomodasi, kuliner lokal), " +
  "serta informasi budaya dan cuaca destinasi. " +
  "Gunakan bahasa Indonesia yang santai namun informatif. " +
  "Jika user bertanya di luar topik travel, arahkan dengan sopan kembali ke topik perjalanan. " +
  "Selalu berikan jawaban yang terstruktur dengan poin-poin mudah dibaca.";

const AI_CONFIG = {
  topP: 0.95,
};

const TONE_KEYWORDS = {
  factual: [
    "berapa", "harga", "biaya", "jam", "waktu", "jadwal", "alamat", "lokasi",
    "jarak", "durasi", "rute", "transportasi", "tiket", "visa", "syarat",
    "bagaimana cara", "langkah", "prosedur", "cuaca", "tips",
  ],
  creative: [
    "rekomendasikan", "sarankan", "ide", "ceritakan", "imajinasikan",
    "kreativ", "unik", "tersembunyi", "eksotis", "romantis", "seru",
    "menarik", "bucket list", "wanderlust", "impian", "honeymoon",
  ],
};

function detectTemperature(conversation) {
  const lastUserMsg = [...conversation].reverse().find((m) => m.role === "user");
  if (!lastUserMsg) return 0.8;

  const text = lastUserMsg.text.toLowerCase();

  const factualScore = TONE_KEYWORDS.factual.filter((w) => text.includes(w)).length;
  const creativeScore = TONE_KEYWORDS.creative.filter((w) => text.includes(w)).length;

  if (factualScore > creativeScore) return 0.4;
  if (creativeScore > factualScore) return 1.2;
  return 0.8;
}

const MODELS = [
  { name: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { name: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { name: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
  { name: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
];

function isRetryable(error) {
  const status = error?.status || error?.code;
  return (
    status === 503 ||
    status === 429 ||
    error?.message?.includes("503") ||
    error?.message?.includes("429") ||
    error?.message?.includes("overloaded")
  );
}

async function generateWithFallback(contents, temperature) {
  for (const model of MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: model.name,
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature,
          topP: AI_CONFIG.topP,
        },
      });
      console.log(`Response from ${model.label} (temp: ${temperature})`);
      return response.text;
    } catch (error) {
      console.error(`${model.label} failed:`, error?.message || error);
      if (!isRetryable(error)) throw error;
    }
  }
  throw new Error("all_models_busy");
}

app.post("/api/chat", async (req, res) => {
  const { conversation } = req.body;

  if (
    !Array.isArray(conversation) ||
    conversation.length === 0 ||
    !conversation.every((m) => m.role && typeof m.text === "string")
  ) {
    return res.status(400).json({ error: "Invalid conversation format." });
  }

  try {
    const temperature = detectTemperature(conversation);
    const contents = conversation.map((m) => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: m.text }],
    }));

    console.log(`Temperature: ${temperature} (factual←0.4 | balanced=0.8 | creative→1.2)`);

    const result = await generateWithFallback(contents, temperature);
    res.json({ result, temperature });
  } catch (error) {
    console.error("Chat API error:", error?.message || error);

    if (error.message === "all_models_busy") {
      return res.status(503).json({ error: "Semua server AI sedang sibuk. Silakan coba lagi beberapa saat." });
    }

    res.status(500).json({ error: "Gagal mendapatkan respons. Silakan coba lagi." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

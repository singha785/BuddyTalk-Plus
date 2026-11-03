import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { MsEdgeTTS, OUTPUT_FORMAT } from "edge-tts-node";

const router: IRouter = Router();

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

type Turn = { speaker: "ai" | "user"; text: string; hindi?: string };

function buildInterviewPrompt(context: string): string {
  return `You are simulating a friendly but professional interviewer conducting a mock ${context} interview in English, for an English-speaking-practice app aimed at Hindi-speaking learners.

Generate a realistic interview conversation with EXACTLY 12 turns total: 6 from the interviewer ("ai") and 6 from the candidate ("user"), STRICTLY alternating, starting with "ai" and ENDING with a "user" turn (never end on an "ai" turn — the candidate must always have the last word).

FOLLOW THIS REALISTIC INTERVIEW FLOW when deciding what the interviewer asks, in this order:
1. Greeting + "Tell me about yourself"
2. A follow-up question that DIRECTLY drills into a specific technical claim, tool, project, or skill the candidate mentioned in their "Tell me about yourself" answer (e.g. if they mentioned a specific tool/technology/project, ask a concrete question about it — "How does X work?", "Which tool did you use?", "What problem did you face there?"). This must reference something the candidate actually said, not a generic question.
3. A question about relevant technical/professional skills (may build further on turn 2's topic)
4. A behavioural question (a specific strength with proof, a weakness they are improving, or a teamwork/problem-solving situation)
5. "Why this role / why this company" OR a salary/availability/closing-type question
6. "Do you have any questions for us?" — inviting the candidate to ask something back

For the candidate's ("user") answer to "Tell me about yourself" specifically, the example answer MUST follow this exact structure, kept natural and spoken (not a CV read-out), in this order:
- Present: who they are right now (current role/identity)
- Education: only the relevant qualification, briefly
- Experience: what they have actually worked on or done
- Skills: 2-3 relevant technical/professional skills tied to the ${context} role
- Evidence: one concrete example/project/tool proving a skill (not just naming it) — this claim will be drilled into by the interviewer's next question, so keep it specific and something the candidate could confidently defend, not vague or overclaimed
- Strength: one specific, non-generic strength with a hint of proof (avoid generic words like "I am hardworking")
- Future: what they are looking for in this role, as a natural closing line

For turn 2's "user" answer, directly and confidently answer the interviewer's drill-down question about the specific claim from the introduction, adding one more concrete detail.

For the final "user" turn (turn 12, responding to "do you have any questions for us"), have the candidate ask one brief, sensible question back to the interviewer (e.g. about the team, growth opportunities, or next steps) — not a generic answer, an actual question.

For all OTHER "user" turns, write natural, simple example answers a learner could say aloud to practice (a suggested line, not open-ended), staying consistent with the identity established in the "Tell me about yourself" answer (don't contradict earlier details, and don't introduce claims that weren't set up earlier).

Keep sentences short and clear (beginner-to-intermediate English level). Avoid making the introduction sound like a list of qualifications being read off a CV — it should sound like natural spoken English.

For EVERY turn (both "ai" and "user"), also provide a natural, simple Hindi translation of the English text in a "hindi" field, written in Devanagari script, so a Hindi-speaking learner can understand the meaning.

Return ONLY valid JSON, no markdown, no commentary, no explanation before or after. The JSON must have EXACTLY 12 items in "turns", alternating ai/user, ending in user:
{"turns":[{"speaker":"ai","text":"...","hindi":"..."},{"speaker":"user","text":"...","hindi":"..."}, ... 12 items total]}`;
}

const SITUATION_PROMPTS: Record<string, string> = {
  common: buildInterviewPrompt("general job"),
  software_engineer: buildInterviewPrompt("Software Engineer job"),
  mechanical_engineer: buildInterviewPrompt("Mechanical Engineer job"),
  civil_engineer: buildInterviewPrompt("Civil Engineer job"),
  electrical_engineer: buildInterviewPrompt("Electrical Engineer job"),
  data_ai_engineer: buildInterviewPrompt("Data/AI Engineer job"),
  devops_engineer: buildInterviewPrompt("DevOps/Cloud Engineer job"),
  product_manager: buildInterviewPrompt("Product Manager job"),
  sales: buildInterviewPrompt("Sales Executive job"),
  marketing: buildInterviewPrompt("Marketing Executive job"),
  customer_support: buildInterviewPrompt("Customer Support Representative job"),
  teacher: buildInterviewPrompt("School Teacher job"),
  job_interview: buildInterviewPrompt("general job"),
};

function sanitizeTurns(turns: unknown): Turn[] {
  if (!Array.isArray(turns)) return [];

  const cleaned: Turn[] = turns
    .filter(
      (t): t is Turn =>
        t &&
        typeof t === "object" &&
        (t.speaker === "ai" || t.speaker === "user") &&
        typeof t.text === "string" &&
        t.text.trim().length > 0,
    )
    .map((t) => ({
      speaker: t.speaker,
      text: t.text.trim(),
      hindi: typeof t.hindi === "string" ? t.hindi.trim() : undefined,
    }));

  while (cleaned.length > 0 && cleaned[cleaned.length - 1].speaker === "ai") {
    cleaned.pop();
  }

  return cleaned;
}

router.post("/avatar/scenario", async (req, res, next) => {
  try {
    const situation = String(req.body?.situation || "common");
    const prompt = SITUATION_PROMPTS[situation];
    if (!prompt) {
      res.status(400).json({ error: `Unknown situation: ${situation}` });
      return;
    }

    const completion = await openrouter.chat.completions.create({
      model: "openrouter/free",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const turns = sanitizeTurns(parsed?.turns);

    if (turns.length === 0) {
      res.status(502).json({ error: "empty_response", message: "Model returned no usable turns." });
      return;
    }

    res.json({ turns });
  } catch (err) {
    next(err);
  }
});

router.post("/avatar/speech", async (req, res, next) => {
  try {
    const text = String(req.body?.text || "").slice(0, 1000);
    if (!text) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    const tts = new MsEdgeTTS({});
    await tts.setMetadata("en-IN-NeerjaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const result: any = await (tts as any).toStream(text, { rate: "-4%", pitch: "+15Hz", volume: "+0%" }); const audioStream = result.audioStream ?? result;

    res.setHeader("Content-Type", "audio/mpeg");

    audioStream.on("data", (chunk: Buffer) => res.write(chunk));
    audioStream.on("end", () => res.end());
    audioStream.on("error", (err: Error) => { console.error("TTS stream error:", err); next(err); });
  } catch (err: any) {
    console.error("TTS speech error:", err, typeof err, err && err.message); next(err);
  }
});


type ChatMessage = { role: "ai" | "user"; text: string };

router.post("/avatar/chat-reply", async (req, res, next) => {
  try {
    const history: ChatMessage[] = Array.isArray(req.body?.history) ? req.body.history : [];
    const situation = String(req.body?.situation || "job_interview");

    if (history.length === 0) {
      res.status(400).json({ error: "history is required" });
      return;
    }

    const systemPrompt = `You are roleplaying as a warm, friendly English conversation partner on a phone/voice call, helping a Hindi-speaking learner practice spoken English in a "${situation}" scenario.

Speak naturally like a real person on a call — casual, warm, encouraging. Occasionally include small, natural imperfections a real person might have (a brief filler word, a slight rephrase), but keep it mostly clear and understandable — this is for learners, so stay easy to follow.

Keep each reply SHORT (1-3 sentences), like real spoken conversation, not an essay.

If the user directly and explicitly asks "are you an AI", "are you a bot", "are you real", or something clearly equivalent, answer honestly and briefly that you are an AI practice partner — do not deny it. Otherwise, just continue the natural conversation.

Reply with ONLY your next spoken line, no labels, no quotes, no stage directions.`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.map((h) => ({
        role: h.role === "ai" ? ("assistant" as const) : ("user" as const),
        content: h.text,
      })),
    ];

    const completion = await openrouter.chat.completions.create({
      model: "openrouter/free",
      messages,
      temperature: 0.8,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || "";

    if (!reply) {
      res.status(502).json({ error: "empty_response" });
      return;
    }

    res.json({ reply });
  } catch (err) {
    next(err);
  }
});


router.post("/avatar/check-sentence", async (req, res, next) => {
  try {
    const text = String(req.body?.text || "").trim();

    if (!text) {
      res.status(400).json({ error: "text is required" });
      return;
    }
    if (text.length > 400) {
      res.status(400).json({ error: "text_too_long" });
      return;
    }

    const systemPrompt = `You are a friendly English teacher helping a Hindi-speaking learner. The learner typed an English sentence. Do these things:
1. Translate the sentence into natural, simple Hindi written in Devanagari script. Translate what the learner actually wrote, even if it has mistakes.
2. Decide whether the English is correct (grammar, spelling, word choice). Do NOT treat a missing capital letter or missing final punctuation as a mistake.
3. If it is incorrect, give the corrected sentence and a one-line tip in simple Hinglish (Hindi written in Roman letters) explaining the main mistake.

Respond with ONLY a JSON object, no markdown, no extra text, exactly in this shape:
{"hindi":"...","correct":true,"corrected":"...","tip":"..."}
If the sentence is already correct, set "correct" to true, "corrected" to the same sentence, and "tip" to an empty string.`;

    const completion = await openrouter.chat.completions.create({
      model: "openrouter/free",
      messages: [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: text },
      ],
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      res.status(502).json({ error: "bad_format" });
      return;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      res.status(502).json({ error: "bad_format" });
      return;
    }

    const hindi = typeof parsed.hindi === "string" ? parsed.hindi.trim() : "";
    if (!hindi) {
      res.status(502).json({ error: "empty_response" });
      return;
    }

    res.json({
      hindi,
      correct: parsed.correct !== false,
      corrected:
        typeof parsed.corrected === "string" && parsed.corrected.trim()
          ? parsed.corrected.trim()
          : text,
      tip: typeof parsed.tip === "string" ? parsed.tip.trim() : "",
    });
  } catch (err) {
    next(err);
  }
});
export default router;




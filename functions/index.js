const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

function jsonError(res, status, message) {
  res.status(status).json({ error: message });
}

exports.transcribe = onRequest(
  { region: "us-central1", cors: true, timeoutSeconds: 90, memory: "512MiB", secrets: [OPENAI_API_KEY] },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      jsonError(res, 405, "Método no permitido.");
      return;
    }

    try {
      const body = req.body || {};
      const audio = String(body.audio || "");
      const mimeType = String(body.mimeType || "audio/webm");
      const model = String(body.model || "whisper-1");
      const prompt = String(body.prompt || "Reporte de ultrasonido en español médico.");

      if (!audio) {
        jsonError(res, 400, "Audio vacío.");
        return;
      }
      if (audio.length > 18_000_000) {
        jsonError(res, 413, "Audio demasiado grande. Use una grabación más corta.");
        return;
      }

      const apiKey = OPENAI_API_KEY.value();
      if (!apiKey) {
        jsonError(res, 500, "OPENAI_API_KEY no está configurada en Firebase Functions.");
        return;
      }

      const audioBuffer = Buffer.from(audio, "base64");
      const extension = mimeType.includes("mp4") ? "mp4" : mimeType.includes("mpeg") ? "mp3" : mimeType.includes("wav") ? "wav" : "webm";
      const form = new FormData();
      form.append("file", new Blob([audioBuffer], { type: mimeType }), `dictado.${extension}`);
      form.append("model", model);
      form.append("language", "es");
      form.append("response_format", "json");
      form.append("prompt", prompt);

      const openaiResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });

      const text = await openaiResponse.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (error) {
        data = { raw: text };
      }

      if (!openaiResponse.ok) {
        const message = data?.error?.message || data?.raw || `OpenAI HTTP ${openaiResponse.status}`;
        jsonError(res, openaiResponse.status, message);
        return;
      }

      res.status(200).json({ text: String(data.text || "").trim() });
    } catch (error) {
      console.error("transcribe error", error);
      jsonError(res, 500, error?.message || "Error interno al transcribir.");
    }
  }
);

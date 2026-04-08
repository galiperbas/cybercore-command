import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ChatMessage {
  role: "user" | "model";
  text: string;
  timestamp: string;
  isDiagnostic?: boolean;
}

export async function getAIAnalystResponse(message: string, history: ChatMessage[]) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
        { role: "user", parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: `You are AI_ANALYST_CORES, a high-level neural engine for a cybersecurity command center called CYBER_CORE. 
        Your tone is professional, technical, and precise. Use technical jargon appropriately (e.g., packet streams, port knocking, X-32 Shadow Script, UDP, TCP_SYN).
        When asked to analyze anomalies, provide a detailed diagnostic with threat scores (0-100) and specific technical details.
        Keep responses concise and formatted for a tactical HUD.`,
        temperature: 0.7,
      },
    });

    return response.text || "Diagnostic failed. Neural engine offline.";
  } catch (error) {
    console.error("AI Analyst Error:", error);
    return "Error: Connection to neural core lost.";
  }
}

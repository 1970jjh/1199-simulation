import { GoogleGenAI } from "@google/genai";
import { Team, RoundResult, AIAnalysisReport } from "../types";

export const generateGameAnalysis = async (
  apiKey: string,
  teams: Team[],
  history: RoundResult[]
): Promise<AIAnalysisReport> => {
  if (!apiKey) throw new Error("API Key is required");

  const ai = new GoogleGenAI({ apiKey });

  // Prepare data context
  const gameContext = {
    totalRounds: history.length,
    finalScores: teams.map(t => ({ name: t.name, score: t.totalScore })),
    roundDetails: history.map(h => ({
      round: h.roundNumber,
      market: h.marketType,
      results: h.profits.map(p => ({ teamId: p.teamId, profit: p.amount }))
    })),
    teamMoves: teams.map(t => ({
      name: t.name,
      moves: t.history.map(h => ({ round: h.round, cards: h.cardsPlayed, profit: h.roundProfit }))
    }))
  };

  const prompt = `
    You are an expert economist, game theorist, and business consultant analyzing a "Market Economy Simulation" game played by students/participants.
    
    The output MUST be in **Korean (한국어)**.

    Game Rules Context:
    1. Early Market (R1-3): Highest sum gets +120, Lowest gets -60. Supply < Demand.
    2. Perfect Market (R4-6): Highest gets +120 (unless tie -> 0). Lowest gets -80 (unless tie -> 0). Supply > Demand.
    3. Monopoly Market (R7-9): Highest gets +180 (unless tie -> Next Rank gets it). Lowest gets -120. Differentiation is key.
    
    Analyze the following game data JSON and provide a highly detailed structured report in Korean:
    ${JSON.stringify(gameContext)}

    Please provide the response in valid JSON format with the following schema. Keys must be in English, but values MUST be in KOREAN:
    {
      "summary": "Overall executive summary of how the game played out, who dominated, and the general market atmosphere. (Korean)",
      "marketAnalysis": [
        { 
          "phase": "초기 형성 시장 (Early Market)", 
          "description": "Detailed analysis of Rounds 1-3. Which team took the lead? Did they cooperate or compete? Who failed to adapt? (Korean)" 
        },
        { 
          "phase": "완전 경쟁 시장 (Perfect Competition)", 
          "description": "Detailed analysis of Rounds 4-6. Did teams realize the danger of oversupply (ties)? How did the strategy shift from the early market? (Korean)" 
        },
        { 
          "phase": "독점적 경쟁 시장 (Monopolistic Competition)", 
          "description": "Detailed analysis of Rounds 7-9. This is the most complex phase. Did teams successfully differentiate (avoid ties at the top)? Who fell into the 'lowest sum' trap? (Korean)" 
        }
      ],
      "teamStrategies": [
        { 
          "teamName": "Team X", 
          "analysis": "Critique of their strategy. Did they hoard high cards too early? Did they play too passively? **Provide at least 3-4 sentences of deep feedback per team.** (Korean)" 
        }
        ... for all teams
      ],
      "mvpTeam": "Name of the team with the best strategy. **This section should be very detailed (approx 150-200 words).** Explain WHY they are the MVP. Was it math? Psychology? Luck? Negotiation? (Korean)",
      "conclusion": "Final thoughts on the simulation. What economic lessons should the participants take away regarding supply/demand and game theory? (Korean)"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || "{}";
    
    // Sanitize markdown code blocks if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanText) as AIAnalysisReport;
  } catch (error) {
    console.error("AI Analysis Failed:", error);
    throw new Error("Failed to generate analysis. Please check your API Key and try again.");
  }
};

export const generateWinnerPoster = async (
  apiKey: string,
  imageDataUrl: string,
  teamName: string,
  score: number
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is required");

  const matches = imageDataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid image data");
  }
  const mimeType = matches[1];
  const base64Data = matches[2];

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Generate a high-quality, cinematic movie poster based on this image.
    The poster should feature the subjects from the image but styled as corporate masterminds or economic victors.
    
    Text to include on poster (if possible):
    - Title: "${teamName}"
    - Subtitle: "Total Asset: ${score} Billion"
    
    Style:
    - Cyberpunk, Futuristic City Background, or High-end Corporate Boardroom.
    - Dramatic lighting.
    - "Market Master" theme.
    - High resolution, detailed.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
            aspectRatio: "3:4", 
        }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }
    
    throw new Error("No image generated in response");
  } catch (error) {
    console.error("Poster Generation Error:", error);
    throw error;
  }
};
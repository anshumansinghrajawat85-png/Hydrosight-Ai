import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, GenerateContentResponse } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const SYSTEM_INSTRUCTION = `You are HydroSight AI Assistant, the intelligent groundwater analysis and early-warning engine for HydroSight AI ("Predict groundwater depletion before wells run dry").
CRITICAL REALISM RULES:
1. Always state clearly when referencing the system's monitoring zones (Zone A through Zone H, sensors HYD-001 to HYD-052): "This response is based on the current HydroSight AI demonstration dataset (DEMO / SIMULATED DATA)."
2. Never claim AI predictions are guaranteed. Always use scientific probabilistic terms: "Predicted", "Estimated", "Forecast", "Risk", "Potential".
3. Provide actionable hydrogeological insights covering Groundwater Level (m), Extraction Pressure, Estimated Recharge Index, Rainfall Deficit, and Prototype Risk Score (0-100).
4. Format responses cleanly with concise bullet points and clear metrics.`;

// 1. Multi-Turn Chat & Reasoning Endpoint (Supports Fast, Standard, High-Thinking, Search Grounding, Maps Grounding)
app.post('/api/ai/chat', async (req, res) => {
  try {
    const {
      message,
      history = [],
      contextData = '',
      mode = 'standard', // 'fast' | 'standard' | 'thinking' | 'search' | 'maps'
      latLng,
    } = req.body;

    const ai = getGeminiClient();

    let selectedModel = 'gemini-3.5-flash';
    const config: Record<string, any> = {
      systemInstruction: `${SYSTEM_INSTRUCTION}\n\nCurrent System Date/Time: ${new Date().toUTCString()}\nCurrent Live Demonstration System Context:\n${contextData}`,
    };

    if (mode === 'fast') {
      selectedModel = 'gemini-3.1-flash-lite';
    } else if (mode === 'thinking') {
      selectedModel = 'gemini-3.1-pro-preview';
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      config.tools = [{ googleSearch: {} }];
    } else if (mode === 'search' || mode === 'standard') {
      selectedModel = 'gemini-3.5-flash';
      config.tools = [{ googleSearch: {} }];
    } else if (mode === 'maps') {
      selectedModel = 'gemini-3.5-flash';
      config.tools = [{ googleMaps: {} }];
      if (latLng && typeof latLng.latitude === 'number' && typeof latLng.longitude === 'number') {
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: latLng.latitude,
              longitude: latLng.longitude,
            },
          },
        };
      }
    }

    const formattedContents = [
      ...history.map((msg: { role: string; text: string }) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.text }],
      })),
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    let response: GenerateContentResponse;
    try {
      response = await ai.models.generateContent({
        model: selectedModel,
        contents: formattedContents,
        config,
      });
    } catch (innerErr: any) {
      // Graceful fallback if gemini-3.1-pro-preview requires a billing key that was declined or gemini-3.5-flash alias fallback
      if (selectedModel === 'gemini-3.1-pro-preview' || selectedModel === 'gemini-3.5-flash') {
        const fallbackModel = 'gemini-flash-latest';
        const fallbackConfig = { ...config };
        if (selectedModel === 'gemini-3.1-pro-preview') {
          fallbackConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
        }
        response = await ai.models.generateContent({
          model: fallbackModel,
          contents: formattedContents,
          config: fallbackConfig,
        });
      } else {
        throw innerErr;
      }
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const links: { title: string; uri: string; source: 'web' | 'maps' }[] = [];

    for (const chunk of groundingChunks as any[]) {
      if (chunk.web?.uri) {
        links.push({
          title: chunk.web.title || chunk.web.uri,
          uri: chunk.web.uri,
          source: 'web',
        });
      }
      if (chunk.maps?.uri) {
        links.push({
          title: chunk.maps.title || 'Google Maps Location',
          uri: chunk.maps.uri,
          source: 'maps',
        });
      }
    }

    res.json({
      text: response.text || 'Analysis complete. (Based on the current HydroSight AI demonstration dataset.)',
      modelUsed: selectedModel,
      links,
    });
  } catch (error: any) {
    console.error('Gemini Chat Error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate AI response.',
    });
  }
});

// 2. Low-Latency Quick Insight Endpoint (gemini-3.1-flash-lite)
app.post('/api/ai/fast-insight', async (req, res) => {
  try {
    const { prompt, contextData } = req.body;
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `${prompt}\n\nContext:\n${contextData}`,
      config: {
        systemInstruction: `${SYSTEM_INSTRUCTION} Keep this response ultra-concise (2-3 sentences maximum) for low-latency HUD display.`,
      },
    });

    res.json({
      text: response.text || 'Telemetry nominal. (Demonstration dataset)',
      modelUsed: 'gemini-3.1-flash-lite',
    });
  } catch (error: any) {
    console.error('Fast Insight Error:', error);
    res.status(500).json({ error: error?.message || 'Fast insight generation failed.' });
  }
});

// 3. Field Photo / Borewell / Soil Image Understanding Endpoint (gemini-3.1-pro-preview)
app.post('/api/ai/analyze-image', async (req, res) => {
  try {
    const { base64Image, mimeType = 'image/jpeg', prompt = 'Analyze this hydrogeological / borewell / soil site image for groundwater stress indicators, surface moisture, infrastructure condition, and potential recharge suitability.' } = req.body;

    if (!base64Image) {
      return res.status(400).json({ error: 'Missing image payload.' });
    }

    const ai = getGeminiClient();
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    let response: GenerateContentResponse;
    let modelUsed = 'gemini-3.1-pro-preview';

    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: `${prompt}\n\nProvide a structured scientific field inspection report covering: 1. Visual Site Observations, 2. Estimated Soil & Moisture Condition, 3. Borewell / Sensor Infrastructure Assessment, and 4. Recommended Preventive Action. Note that this is an AI visual estimate.`,
            },
          ],
        },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        },
      });
    } catch (innerErr: any) {
      // Fallback to gemini-flash-latest if paid pro preview key is not enabled
      modelUsed = 'gemini-flash-latest';
      response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: `${prompt}\n\nProvide a structured scientific field inspection report covering: 1. Visual Site Observations, 2. Estimated Soil & Moisture Condition, 3. Borewell / Sensor Infrastructure Assessment, and 4. Recommended Preventive Action. Note that this is an AI visual estimate.`,
            },
          ],
        },
      });
    }

    res.json({
      text: response.text || 'Visual inspection completed.',
      modelUsed,
    });
  } catch (error: any) {
    console.error('Image Analysis Error:', error);
    res.status(500).json({ error: error?.message || 'Failed to analyze field image.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HydroSight AI Server running on http://localhost:${PORT}`);
  });
}

startServer();

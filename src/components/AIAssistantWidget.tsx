import React, { useState, useRef } from 'react';
import {
  Send,
  X,
  Brain,
  Zap,
  Globe,
  MapPin,
  Camera,
  ExternalLink,
  Upload,
} from 'lucide-react';
import { HydroSightLogo } from './HydroSightLogo';
import { ZoneData, AlertItem, SimulationScenario } from '../data/hydroData';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  modeUsed?: string;
  links?: { title: string; uri: string; source: 'web' | 'maps' }[];
  timestamp: string;
}

interface AIAssistantProps {
  zones: ZoneData[];
  alerts: AlertItem[];
  scenario: SimulationScenario;
  selectedZone: ZoneData;
  isFullPage?: boolean;
  externalOpen?: boolean;
  onToggleExternalOpen?: (open: boolean) => void;
}

const SUGGESTED_QUESTIONS = [
  'Which zone is at highest risk?',
  'Why is Zone D critical?',
  'Show the groundwater forecast.',
  'Which area has low recharge?',
  'What happened this month?',
  'What action should be taken?',
  'Show critical alerts.',
];

export const AIAssistantWidget: React.FC<AIAssistantProps> = ({
  zones,
  alerts,
  scenario,
  selectedZone,
  isFullPage = false,
  externalOpen,
  onToggleExternalOpen,
}) => {
  const [internalOpen, setInternalOpen] = useState<boolean>(isFullPage);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (val: boolean) => {
    setInternalOpen(val);
    if (onToggleExternalOpen) onToggleExternalOpen(val);
  };

  // Default to 'search' so every query is connected with live Google Search Grounding + HydroSight AI telemetry
  const [aiMode, setAiMode] = useState<'search' | 'standard' | 'fast' | 'thinking' | 'maps'>(
    'search'
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: `HydroSight AI Intelligence Engine Online (Google Search & GIS Grounding Connected).\n\nCurrently monitoring **52 points (47 active sensors)** under scenario **${scenario}**. **Zone D** currently has the highest demonstration risk score of **${
        zones.find((z) => z.id === 'ZONE-D')?.riskScore || 82
      }/100 (CRITICAL)**.\n\n*This response is based on the current HydroSight AI demonstration dataset (DEMO / SIMULATED DATA).*`,
      modeUsed: 'Google Search + HydroSight Core',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [imageAnalyzing, setImageAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const buildSystemContextString = () => {
    const zSummary = zones
      .map(
        (z) =>
          `${z.id} (${z.name}): Depth=${z.groundwaterLevel}m, Trend=${z.trend}, Extraction=${z.extractionPressurePct}% (${z.extractionRate} L/d), Rainfall=${z.rainfallMm}mm, Est.Recharge=${z.estimatedRechargeIndexPct}%, Risk=${z.riskScore}/100 (${z.riskLevel}), Forecast 30/60/90d=${z.forecast30d}m/${z.forecast60d}m/${z.forecast90d}m`
      )
      .join('\n');
    const aSummary = alerts
      .map((a) => `[${a.severity}] ${a.zoneId}: ${a.title} (Risk ${a.riskScore}, ${a.exactDateTime})`)
      .join('; ');
    return `Active Scenario: ${scenario}\nSelected Zone: ${selectedZone.name}\nZones:\n${zSummary}\nActive Alerts: ${aSummary}`;
  };

  const handleSendMessage = async (questionText?: string) => {
    const queryText = (questionText ?? input).trim();
    if (!queryText || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionText) setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: queryText,
          history: historyPayload,
          contextData: buildSystemContextString(),
          mode: aiMode,
          latLng: { latitude: selectedZone.lat, longitude: selectedZone.lng },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      const modeBadgeMap: Record<string, string> = {
        search: 'Google Search Grounding (gemini-3.5-flash)',
        standard: 'Standard + Search (gemini-3.5-flash)',
        fast: 'Bolt Low-Latency (gemini-3.1-flash-lite)',
        thinking: 'High Thinking + Search (gemini-3.1-pro-preview)',
        maps: 'Google Maps Grounding (gemini-3.5-flash)',
      };

      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        role: 'assistant',
        text: data.text,
        modeUsed: modeBadgeMap[aiMode] || data.modelUsed,
        links: data.links || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const dZone = zones.find((z) => z.id === 'ZONE-D') || zones[3];
      const fallbackText = `Based on the active **${scenario}** demonstration state:\n- **Highest Risk Zone**: ${dZone.name} with a prototype risk score of **${dZone.riskScore}/100 (${dZone.riskLevel})**.\n- **Indicators**: Groundwater depth at **${dZone.groundwaterLevel} m** (90-day forecast: **${dZone.forecast90d} m**), extraction pressure at **${dZone.extractionPressurePct}%**, and Estimated Recharge Index at **${dZone.estimatedRechargeIndexPct}%**.\n- **Recommended Action**: ${dZone.recommendation}\n\n*This response is based on the current HydroSight AI demonstration dataset.*`;
      setMessages((prev) => [
        ...prev,
        {
          id: `b-err-${Date.now()}`,
          role: 'assistant',
          text: fallbackText,
          modeUsed: 'HydroSight Telemetry Engine',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageMime(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeUploadedImage = async () => {
    if (!imagePreview || imageAnalyzing) return;
    setImageAnalyzing(true);

    const userMsg: ChatMessage = {
      id: `u-img-${Date.now()}`,
      role: 'user',
      text: `Uploaded field inspection photo for hydrogeological & borewell assessment in ${selectedZone.name}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch('/api/ai/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Image: imagePreview,
          mimeType: imageMime,
          prompt: `Analyze this field image for ${selectedZone.name} (Current Groundwater Depth: ${selectedZone.groundwaterLevel}m, Risk: ${selectedZone.riskScore}/100). Evaluate soil surface moisture, borewell casing/pump condition, or recharge pit potential.`,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: `b-img-${Date.now()}`,
          role: 'assistant',
          text:
            data.text ||
            'Visual field analysis completed. Check surface permeability and sensor housing seals.',
          modeUsed: `Vision Inspector (${data.modelUsed || 'gemini-3.1-pro-preview'})`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setImagePreview(null);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `b-img-err-${Date.now()}`,
          role: 'assistant',
          text: 'Could not complete visual analysis. Please verify your image format.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setImageAnalyzing(false);
    }
  };

  const renderChatContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header with Unified HydroSightLogo */}
      <div className="px-4 py-3.5 bg-slate-50 dark:bg-[#070B14] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <HydroSightLogo size={30} />
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>HydroSight AI Assistant</span>
            </div>
            <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
              🟢 Intelligence & Google Search Online
            </div>
          </div>
        </div>
        {!isFullPage && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Gemini Intelligence Mode Selector */}
      <div className="px-3.5 py-2 bg-slate-100/80 dark:bg-[#090F1E] border-b border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mr-1">
          GROUNDING:
        </span>
        <button
          type="button"
          onClick={() => setAiMode('search')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
            aiMode === 'search'
              ? 'bg-cyan-500 text-slate-950 font-semibold'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
          }`}
          title="Google Search Grounding via gemini-3.5-flash"
        >
          <Globe className="w-3 h-3" />
          <span>Google Search</span>
        </button>
        <button
          type="button"
          onClick={() => setAiMode('maps')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
            aiMode === 'maps'
              ? 'bg-emerald-500 text-slate-950 font-semibold'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
          }`}
          title="Google Maps Grounding via gemini-3.5-flash"
        >
          <MapPin className="w-3 h-3" />
          <span>Maps Grounding</span>
        </button>
        <button
          type="button"
          onClick={() => setAiMode('thinking')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
            aiMode === 'thinking'
              ? 'bg-purple-500 text-white font-semibold'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
          }`}
          title="High Thinking Mode (ThinkingLevel.HIGH) + Search"
        >
          <Brain className="w-3 h-3" />
          <span>High Thinking</span>
        </button>
        <button
          type="button"
          onClick={() => setAiMode('fast')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
            aiMode === 'fast'
              ? 'bg-amber-500 text-slate-950 font-semibold'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
          }`}
          title="Low-latency responses using gemini-3.1-flash-lite"
        >
          <Zap className="w-3 h-3" />
          <span>Fast Lite</span>
        </button>
      </div>

      {/* Suggested Questions Bar */}
      <div className="px-3.5 py-2 bg-slate-50 dark:bg-[#070B14]/60 border-b border-slate-200 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleSendMessage(q)}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-cyan-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] text-cyan-700 dark:text-cyan-300 whitespace-nowrap shrink-0 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages Thread */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[280px] max-h-[420px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-100 dark:bg-[#070B14] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
              }`}
            >
              {msg.modeUsed && (
                <div className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 mb-1">
                  {msg.modeUsed} · {msg.timestamp}
                </div>
              )}
              <div className="whitespace-pre-line">{msg.text}</div>

              {msg.links && msg.links.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-300 dark:border-slate-800 space-y-1">
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    Google Search / Maps Citations:
                  </div>
                  {msg.links.map((l, i) => (
                    <a
                      key={i}
                      href={l.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline truncate"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        [{l.source.toUpperCase()}] {l.title}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 bg-slate-100 dark:bg-[#070B14] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 inline-block">
            {aiMode === 'thinking'
              ? 'Deep Hydrogeological Reasoning + Search in progress...'
              : 'Searching Google & analyzing HydroSight AI telemetry...'}
          </div>
        )}
      </div>

      {/* Optional Field Photo Upload Preview */}
      {imagePreview && (
        <div className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img
              src={imagePreview}
              alt="Field upload preview"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-lg object-cover border border-cyan-500/40"
            />
            <div className="text-xs">
              <div className="text-slate-800 dark:text-slate-200 font-medium">
                Field Site Photo Ready
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                Vision Inspector
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleAnalyzeUploadedImage}
              disabled={imageAnalyzing}
              className="px-3 py-1 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-xs hover:bg-cyan-400"
            >
              {imageAnalyzing ? 'Analyzing...' : 'Analyze Photo'}
            </button>
            <button
              type="button"
              onClick={() => setImagePreview(null)}
              className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="p-3.5 bg-slate-50 dark:bg-[#070B14] border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-cyan-600 dark:text-cyan-400"
          title="Upload field borewell or soil photo for Gemini visual inspection"
        >
          <Camera className="w-4 h-4" />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage();
          }}
          placeholder="Ask HydroSight AI (connected to Google Search)..."
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
        />
        <button
          type="button"
          onClick={() => handleSendMessage()}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </div>
    </div>
  );

  if (isFullPage) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 h-[650px]">{renderChatContent()}</div>
        <div className="lg:col-span-4 space-y-5">
          {/* Field Image Inspector Card */}
          <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Field Photo & Borewell Vision Inspector
              </h3>
              <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">
                GEMINI VISION
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Upload a photo of a borewell head, piezometer installation, dry soil crack pattern,
              or rainwater harvesting basin for multi-modal hydrogeological analysis.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3.5 px-4 rounded-xl border border-dashed border-cyan-500/50 bg-cyan-50/50 dark:bg-[#070B14] hover:bg-cyan-100/50 dark:hover:bg-slate-900 text-xs font-semibold text-cyan-700 dark:text-cyan-300 flex items-center justify-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Select Field Photo to Analyze</span>
            </button>
          </div>

          {/* Intelligence Modes Reference Card */}
          <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Search-Grounded Intelligence Routing
            </h3>
            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <div>
                <div className="font-semibold text-cyan-600 dark:text-cyan-400">
                  Google Search Grounding (Default)
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Fuses live web search citations with HydroSight AI aquifer telemetry.
                </div>
              </div>
              <div>
                <div className="font-semibold text-purple-600 dark:text-purple-400">
                  High Thinking Mode (gemini-3.1-pro-preview)
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Configured with ThinkingLevel.HIGH for complex watershed policy and drought
                  intervention planning.
                </div>
              </div>
              <div>
                <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Google Maps Grounding (gemini-3.5-flash)
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Retrieves verified catchment geography and water body context.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen ? (
        <div className="w-[380px] sm:w-[430px] h-[550px]">{renderChatContent()}</div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Ask HydroSight AI"
          className="group flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-full bg-white dark:bg-[#0B1120] hover:bg-slate-50 dark:hover:bg-slate-900 border border-cyan-500/60 shadow-2xl transition-all"
        >
          <HydroSightLogo size={30} />
          <div className="text-left">
            <div className="text-xs font-bold text-slate-900 dark:text-white leading-none">
              Ask HydroSight AI
            </div>
            <div className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">
              Search + Telemetry Online
            </div>
          </div>
        </button>
      )}
    </div>
  );
};

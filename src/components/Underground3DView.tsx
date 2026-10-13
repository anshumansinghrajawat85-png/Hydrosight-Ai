import React, { useState } from 'react';
import { RotateCcw, ZoomIn, ZoomOut, Layers } from 'lucide-react';
import { ZoneData } from '../data/hydroData';

interface Underground3DViewProps {
  selectedZone?: ZoneData;
  isHeroCompact?: boolean;
  scenarioName?: string;
}

export const Underground3DView: React.FC<Underground3DViewProps> = ({
  selectedZone,
  isHeroCompact = false,
  scenarioName = 'Normal Conditions',
}) => {
  const [rotX, setRotX] = useState<number>(isHeroCompact ? 16 : 18);
  const [rotY, setRotY] = useState<number>(isHeroCompact ? -18 : -22);
  const [zoom, setZoom] = useState<number>(1);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [showFlowVectors, setShowFlowVectors] = useState<boolean>(true);
  const [showAINodes, setShowAINodes] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const waterDepth = selectedZone ? selectedZone.groundwaterLevel : 36.8;
  const rechargeIdx = selectedZone ? selectedZone.estimatedRechargeIndexPct : 18;
  const riskScore = selectedZone ? selectedZone.riskScore : 61;

  const waterTableY = Math.min(238, Math.max(158, 130 + (waterDepth - 18) * 3.1));

  const layers = [
    {
      id: 'surface',
      name: '01. Ground Surface & Catchments',
      depth: '0.0 m – 2.5 m',
      desc: 'Topographic surface receiving precipitation, agricultural irrigation, and surface runoff infiltration.',
      color: '#10B981',
    },
    {
      id: 'soil',
      name: '02. Vadose Soil & Alluvial Horizon',
      depth: '2.5 m – 14.0 m',
      desc: 'Unsaturated soil moisture zone where rainwater percolates downward toward the capillary fringe.',
      color: '#D97706',
    },
    {
      id: 'rock',
      name: '03. Fractured Rock & Semi-Confining Layer',
      depth: '14.0 m – 28.0 m',
      desc: 'Weathered hard-rock and siltstone stratum regulating vertical infiltration velocity.',
      color: '#64748B',
    },
    {
      id: 'table',
      name: '04. Dynamic Phreatic Groundwater Table',
      depth: `${waterDepth.toFixed(1)} m (Current Piezometric Level)`,
      desc: 'Active upper boundary of saturation tracked continuously by hydrostatic ESP32 piezometers.',
      color: '#06B6D4',
    },
    {
      id: 'aquifer',
      name: '05. Primary Unconfined Aquifer',
      depth: '28.0 m – 65.0 m',
      desc: 'Primary water-bearing sand and gravel formation supplying agricultural and municipal borewells.',
      color: '#0284C7',
    },
    {
      id: 'deep',
      name: '06. Deep Confined Bedrock Aquifer',
      depth: '65.0 m – 120.0+ m',
      desc: 'Slow-recharging deep reserve under high hydrostatic pressure; vulnerable to over-extraction.',
      color: '#1E3A8A',
    },
  ];

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setRotY((prev) => Math.max(-45, Math.min(45, prev + dx * 0.25)));
    setRotX((prev) => Math.max(5, Math.min(35, prev - dy * 0.2)));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-sm">
      {/* Top Scientific Control Bar */}
      <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 dark:bg-[#070B14]/60">
        <div className="flex items-center gap-3">
          <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span className="text-xs font-bold tracking-wide text-slate-800 dark:text-slate-100">
            Interactive 3D Hydrogeological Stratigraphy & Borewell Telemetry
          </span>
          <span className="text-xs text-slate-400">·</span>
          <span className="text-xs font-mono font-semibold text-cyan-600 dark:text-cyan-400 tabular-nums">
            Water Table: -{waterDepth.toFixed(1)} m
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFlowVectors(!showFlowVectors)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              showFlowVectors
                ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500/40 text-cyan-700 dark:text-cyan-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Recharge Flow
          </button>
          <button
            type="button"
            onClick={() => setShowAINodes(!showAINodes)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              showAINodes
                ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500/40 text-teal-700 dark:text-teal-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            IoT & AI Telemetry
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.3, Number((z + 0.1).toFixed(2))))}
            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.8, Number((z - 0.1).toFixed(2))))}
            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setRotX(isHeroCompact ? 16 : 18);
              setRotY(isHeroCompact ? -18 : -22);
              setZoom(1);
            }}
            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            title="Reset 3D Camera"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive 3D Viewport Stage */}
      <div
        className="relative w-full select-none cursor-grab active:cursor-grabbing overflow-hidden bg-gradient-to-b from-[#070B14] via-[#091428] to-[#060A12]"
        style={{ height: isHeroCompact ? 420 : 480, perspective: '1100px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Top-left Telemetry Readout HUD */}
        <div className="absolute top-4 left-4 z-10 bg-slate-950/85 backdrop-blur border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs space-y-1 pointer-events-none">
          <div className="text-slate-200 font-semibold">
            {selectedZone ? selectedZone.name : 'Regional Aquifer Cross-Section'}
          </div>
          <div className="flex items-center gap-3 font-mono tabular-nums text-[11px]">
            <span className="text-cyan-400">Depth: {waterDepth.toFixed(1)}m</span>
            <span className="text-slate-600">·</span>
            <span className="text-teal-400">Est. Recharge: {rechargeIdx}%</span>
            <span className="text-slate-600">·</span>
            <span
              className={
                riskScore >= 76
                  ? 'text-rose-400 font-semibold'
                  : riskScore >= 51
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }
            >
              Risk: {riskScore}/100
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Drag to rotate 3D block · Scenario: {scenarioName} · DEMO DATA
          </div>
        </div>

        {/* 3D Transformed Isometric SVG Block */}
        <div
          className="w-full h-full flex items-center justify-center transition-transform duration-75"
          style={{
            transform: `scale(${zoom}) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          <svg
            viewBox="0 0 760 440"
            className="w-full max-w-[740px] h-auto overflow-visible"
          >
            <defs>
              <linearGradient id="surfaceTopGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#065F46" />
                <stop offset="50%" stopColor="#047857" />
                <stop offset="100%" stopColor="#064E3B" />
              </linearGradient>
              <linearGradient id="soilLayerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#78350F" />
                <stop offset="100%" stopColor="#451A03" />
              </linearGradient>
              <linearGradient id="rockLayerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#1E293B" />
              </linearGradient>
              <linearGradient id="aquiferWaterGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0284C7" stopOpacity="0.88" />
                <stop offset="50%" stopColor="#0369A1" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#0F172A" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="deepAquiferGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1E3A8A" />
                <stop offset="100%" stopColor="#090D16" />
              </linearGradient>
            </defs>

            {/* RAINFALL & PRECIPITATION ANIMATION */}
            {showFlowVectors && (
              <g opacity="0.85">
                {[170, 230, 290, 350, 410, 470, 530, 580].map((rx, idx) => (
                  <g key={rx}>
                    <line
                      x1={rx}
                      y1={18 + (idx % 3) * 12}
                      x2={rx - 8}
                      y2={48 + (idx % 3) * 12}
                      stroke="#38BDF8"
                      strokeWidth="1.5"
                      strokeDasharray="6 6"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="24"
                        to="0"
                        dur="1.4s"
                        repeatCount="indefinite"
                      />
                    </line>
                  </g>
                ))}
                <text x="155" y="24" fill="#38BDF8" fontSize="10" fontFamily="JetBrains Mono">
                  PRECIPITATION & SURFACE INFILTRATION ↓
                </text>
              </g>
            )}

            {/* ISOMETRIC TOP SURFACE PLANE */}
            <polygon
              points="380,45 660,115 380,185 100,115"
              fill="url(#surfaceTopGrad)"
              stroke="#10B981"
              strokeWidth="1.5"
              onClick={() => setSelectedLayer('surface')}
              className="cursor-pointer hover:opacity-95"
            />

            {/* Surface River / Recharge Channel on Top Plane */}
            <path
              d="M 240,85 Q 360,120 490,155"
              fill="none"
              stroke="#22D3EE"
              strokeWidth="6"
              strokeLinecap="round"
              strokeOpacity="0.7"
            />

            {/* LAYER 2: VADOSE SOIL */}
            <polygon
              points="100,115 380,185 380,225 100,155"
              fill="url(#soilLayerGrad)"
              stroke="#92400E"
              strokeWidth="1"
              onClick={() => setSelectedLayer('soil')}
              className="cursor-pointer"
            />
            <polygon
              points="380,185 660,115 660,155 380,225"
              fill="#3B1806"
              stroke="#78350F"
              strokeWidth="1"
              onClick={() => setSelectedLayer('soil')}
              className="cursor-pointer"
            />

            {/* LAYER 3: FRACTURED ROCK */}
            <polygon
              points={`100,155 380,225 380,${waterTableY + 40} 100,${waterTableY - 30}`}
              fill="url(#rockLayerGrad)"
              stroke="#475569"
              strokeWidth="1"
              onClick={() => setSelectedLayer('rock')}
              className="cursor-pointer"
            />
            <polygon
              points={`380,225 660,155 660,${waterTableY - 30} 380,${waterTableY + 40}`}
              fill="#1E293B"
              stroke="#334155"
              strokeWidth="1"
              onClick={() => setSelectedLayer('rock')}
              className="cursor-pointer"
            />

            {/* LAYER 4 & 5: SATURATED UNCONFINED AQUIFER */}
            <polygon
              points={`100,${waterTableY - 30} 380,${waterTableY + 40} 380,355 100,285`}
              fill="url(#aquiferWaterGrad)"
              stroke="#22D3EE"
              strokeWidth="1.5"
              onClick={() => setSelectedLayer('aquifer')}
              className="cursor-pointer"
            />
            <polygon
              points={`380,${waterTableY + 40} 660,${waterTableY - 30} 660,285 380,355`}
              fill="#0369A1"
              fillOpacity="0.85"
              stroke="#0284C7"
              strokeWidth="1.5"
              onClick={() => setSelectedLayer('aquifer')}
              className="cursor-pointer"
            />

            {/* DYNAMIC GROUNDWATER TABLE GLOWING BOUNDARY LINE */}
            <polyline
              points={`100,${waterTableY - 30} 380,${waterTableY + 40} 660,${waterTableY - 30}`}
              fill="none"
              stroke="#22D3EE"
              strokeWidth="3"
              strokeDasharray="8 4"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="24"
                to="0"
                dur="2s"
                repeatCount="indefinite"
              />
            </polyline>

            {/* LAYER 6: DEEP CONFINED BEDROCK AQUIFER */}
            <polygon
              points="100,285 380,355 380,405 100,335"
              fill="url(#deepAquiferGrad)"
              stroke="#1E40AF"
              strokeWidth="1"
              onClick={() => setSelectedLayer('deep')}
              className="cursor-pointer"
            />
            <polygon
              points="380,355 660,285 660,335 380,405"
              fill="#0F172A"
              stroke="#1E3A8A"
              strokeWidth="1"
              onClick={() => setSelectedLayer('deep')}
              className="cursor-pointer"
            />

            {/* INFILTRATION & UNDERGROUND WATER MOVEMENT ARROWS */}
            {showFlowVectors && (
              <g>
                {[210, 320, 440, 540].map((px, i) => (
                  <line
                    key={px}
                    x1={px}
                    y1={140 + (i % 2) * 15}
                    x2={px}
                    y2={waterTableY + 15}
                    stroke="#2DD4BF"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="16"
                      to="0"
                      dur="1.8s"
                      repeatCount="indefinite"
                    />
                  </line>
                ))}
                <path
                  d={`M 150,${waterTableY + 25} Q 260,${waterTableY + 55} 365,${waterTableY + 75}`}
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="20"
                    to="0"
                    dur="1.6s"
                    repeatCount="indefinite"
                  />
                </path>
                <path
                  d={`M 400,${waterTableY + 75} Q 510,${waterTableY + 50} 620,${waterTableY + 20}`}
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="20"
                    to="0"
                    dur="1.6s"
                    repeatCount="indefinite"
                  />
                </path>
              </g>
            )}

            {/* BOREWELL 1 (Left — HYD-001 Observation Well) */}
            <g>
              <line x1="250" y1="95" x2="250" y2="310" stroke="#94A3B8" strokeWidth="5" />
              <line
                x1="250"
                y1="95"
                x2="250"
                y2="310"
                stroke="#0F172A"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
              <circle
                cx="250"
                cy={waterTableY + 30}
                r="6"
                fill="#22D3EE"
                stroke="#0F172A"
                strokeWidth="2"
              />
              <rect
                x="242"
                y="78"
                width="16"
                height="17"
                rx="2"
                fill="#0284C7"
                stroke="#E2E8F0"
                strokeWidth="1.2"
              />
              <text
                x="195"
                y="72"
                fill="#E2E8F0"
                fontSize="10"
                fontFamily="JetBrains Mono"
                fontWeight="600"
              >
                HYD-001 (IoT)
              </text>
            </g>

            {/* BOREWELL 2 (Center-Right — High Extraction Borewell HYD-022) */}
            <g>
              <line x1="470" y1="110" x2="470" y2="345" stroke="#CBD5E1" strokeWidth="6" />
              <circle
                cx="470"
                cy={waterTableY + 42}
                r="7"
                fill={riskScore >= 75 ? '#F43F5E' : '#F59E0B'}
                stroke="#0F172A"
                strokeWidth="2"
              />
              <rect
                x="460"
                y="92"
                width="20"
                height="18"
                rx="3"
                fill={riskScore >= 75 ? '#E11D48' : '#D97706'}
                stroke="#F8FAFC"
                strokeWidth="1.2"
              />
              <text
                x="430"
                y="85"
                fill="#F8FAFC"
                fontSize="10"
                fontFamily="JetBrains Mono"
                fontWeight="600"
              >
                BOREWELL HYD-022
              </text>
            </g>

            {/* AI TELEMETRY NEURAL DATA ARCS */}
            {showAINodes && (
              <g>
                <rect
                  x="332"
                  y="10"
                  width="96"
                  height="26"
                  rx="6"
                  fill="#0F172A"
                  stroke="#22D3EE"
                  strokeWidth="1.5"
                />
                <text
                  x="344"
                  y="26"
                  fill="#22D3EE"
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                  fontWeight="700"
                >
                  AI ENGINE HUB
                </text>

                <path
                  d="M 250,78 Q 290,30 332,23"
                  fill="none"
                  stroke="#22D3EE"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="-16"
                    dur="1.2s"
                    repeatCount="indefinite"
                  />
                </path>
                <path
                  d="M 470,92 Q 440,35 428,23"
                  fill="none"
                  stroke="#F43F5E"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="-16"
                    dur="1.0s"
                    repeatCount="indefinite"
                  />
                </path>
              </g>
            )}

            {/* STRATIGRAPHY CALLOUT LABELS ON RIGHT */}
            <g fontFamily="JetBrains Mono" fontSize="10" fill="#94A3B8">
              <text x="672" y="120" fill="#34D399">
                0m Surface
              </text>
              <text x="672" y="152" fill="#FBBF24">
                -14m Soil
              </text>
              <text x="672" y={waterTableY - 26} fill="#22D3EE" fontWeight="700">
                -{waterDepth.toFixed(1)}m Water Table
              </text>
              <text x="672" y="285" fill="#38BDF8">
                -65m Aquifer
              </text>
              <text x="672" y="335" fill="#818CF8">
                -120m Bedrock
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* Bottom Interactive Layer Selector Bar */}
      <div className="p-3.5 bg-slate-50 dark:bg-[#070B14] border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {layers.map((layer) => {
          const isSelected = selectedLayer === layer.id;
          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => setSelectedLayer(isSelected ? null : layer.id)}
              className={`text-left p-2.5 rounded-xl border transition-colors ${
                isSelected
                  ? 'bg-cyan-50/80 dark:bg-slate-800/90 border-cyan-500/60'
                  : 'bg-white dark:bg-[#0B1120] border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {layer.name.split('. ')[1]}
                </span>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: layer.color }}
                />
              </div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                {layer.depth}
              </div>
            </button>
          );
        })}
      </div>

      {selectedLayer && (
        <div className="px-4 py-3 bg-slate-100 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-4">
          <div>
            <span className="font-semibold text-cyan-700 dark:text-cyan-400 mr-2">
              {layers.find((l) => l.id === selectedLayer)?.name}:
            </span>
            <span className="text-slate-700 dark:text-slate-300">
              {layers.find((l) => l.id === selectedLayer)?.desc}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedLayer(null)}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs font-mono shrink-0"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

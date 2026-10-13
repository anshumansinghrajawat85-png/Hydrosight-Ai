import React, { useState, useMemo } from 'react';
import { APIProvider, Map as GoogleMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, useMap } from 'react-leaflet';
import {
  Search,
  ArrowUpRight,
  Compass,
  ExternalLink,
} from 'lucide-react';
import { ZoneData, SensorNode, RiskLevel } from '../data/hydroData';

interface LiveGroundwaterMapProps {
  zones: ZoneData[];
  sensors: SensorNode[];
  selectedZone: ZoneData;
  onSelectZone: (zone: ZoneData) => void;
  onNavigateTab: (tab: string) => void;
  themeMode?: 'dark' | 'light';
}

function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'CRITICAL':
      return '#F43F5E';
    case 'HIGH':
      return '#F97316';
    case 'MODERATE':
      return '#EAB308';
    case 'LOW':
    default:
      return '#10B981';
  }
}

function getRiskLabelBadge(level: RiskLevel): string {
  switch (level) {
    case 'CRITICAL':
      return '🔴 CRITICAL';
    case 'HIGH':
      return '🟠 HIGH RISK';
    case 'MODERATE':
      return '🟡 MODERATE';
    case 'LOW':
    default:
      return '🟢 LOW RISK';
  }
}

const LeafletMapRecenter: React.FC<{ lat: number; lng: number; zoom: number }> = ({
  lat,
  lng,
  zoom,
}) => {
  const map = useMap();
  React.useEffect(() => {
    map.setView([lat, lng], zoom, { animate: true });
  }, [lat, lng, zoom, map]);
  return null;
};

export const LiveGroundwaterMap: React.FC<LiveGroundwaterMapProps> = ({
  zones,
  sensors,
  selectedZone,
  onSelectZone,
  onNavigateTab,
  themeMode = 'dark',
}) => {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [searchQuery, setSearchQuery] = useState('');
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite' | 'terrain'>('standard');
  const [activeLayer, setActiveLayer] = useState<
    'risk' | 'groundwater' | 'rainfall' | 'extraction' | 'recharge'
  >('risk');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMonitoringPoints, setShowMonitoringPoints] = useState(true);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 28.56,
    lng: 77.18,
  });
  const [mapZoom, setMapZoom] = useState<number>(10);

  const [groundingLoading, setGroundingLoading] = useState(false);
  const [groundingResult, setGroundingResult] = useState<{
    text: string;
    links: { title: string; uri: string }[];
  } | null>(null);

  const filteredZones = useMemo(() => {
    if (!searchQuery.trim()) return zones;
    const q = searchQuery.toLowerCase();
    return zones.filter(
      (z) =>
        z.name.toLowerCase().includes(q) ||
        z.id.toLowerCase().includes(q) ||
        z.region.toLowerCase().includes(q) ||
        z.riskLevel.toLowerCase().includes(q)
    );
  }, [zones, searchQuery]);

  const filteredSensors = useMemo(() => {
    if (!showMonitoringPoints) return [];
    if (!searchQuery.trim()) return sensors;
    const q = searchQuery.toLowerCase();
    return sensors.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.zoneId.toLowerCase().includes(q) ||
        s.zoneName.toLowerCase().includes(q)
    );
  }, [sensors, showMonitoringPoints, searchQuery]);

  const handleZoneClick = (zone: ZoneData) => {
    onSelectZone(zone);
    setMapCenter({ lat: zone.lat, lng: zone.lng });
    setMapZoom(11);
    setGroundingResult(null);
  };

  const handleRunMapsGrounding = async () => {
    setGroundingLoading(true);
    setGroundingResult(null);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'maps',
          latLng: { latitude: selectedZone.lat, longitude: selectedZone.lng },
          message: `Identify nearby geographical features, water bodies, agricultural or urban catchment characteristics around coordinates (${selectedZone.lat}, ${selectedZone.lng}) in ${selectedZone.name}, and explain how local geography affects groundwater recharge and extraction stress.`,
          contextData: `Zone: ${selectedZone.name}, Depth: ${selectedZone.groundwaterLevel}m, Risk: ${selectedZone.riskScore}/100 (${selectedZone.riskLevel})`,
        }),
      });
      const data = await res.json();
      setGroundingResult({
        text: data.text || 'Geographic context retrieved.',
        links: data.links || [],
      });
    } catch {
      setGroundingResult({
        text: 'Unable to fetch live Maps Grounding at this moment.',
        links: [],
      });
    } finally {
      setGroundingLoading(false);
    }
  };

  const tileUrl =
    mapStyle === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : mapStyle === 'terrain'
      ? 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
      : themeMode === 'light'
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  const getLayerValueText = (z: ZoneData) => {
    switch (activeLayer) {
      case 'groundwater':
        return `${z.groundwaterLevel}m`;
      case 'rainfall':
        return `${z.rainfallMm}mm`;
      case 'extraction':
        return `${z.extractionPressurePct}%`;
      case 'recharge':
        return `${z.estimatedRechargeIndexPct}%`;
      case 'risk':
      default:
        return `${z.riskScore}/100`;
    }
  };

  return (
    <div className="space-y-5">
      {/* Top GIS Toolbar */}
      <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter Zone (e.g. Zone D), Sensor (HYD-001)..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#070B14] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Layer Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'risk', label: 'Risk Layer' },
              { id: 'groundwater', label: 'Groundwater Layer' },
              { id: 'rainfall', label: 'Rainfall Layer' },
              { id: 'extraction', label: 'Extraction Layer' },
              { id: 'recharge', label: 'Recharge Layer' },
            ] as const
          ).map((layer) => (
            <button
              key={layer.id}
              type="button"
              onClick={() => setActiveLayer(layer.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
                activeLayer === layer.id
                  ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-700 dark:text-cyan-300 font-semibold'
                  : 'bg-slate-50 dark:bg-[#070B14] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {layer.label}
            </button>
          ))}
        </div>

        {/* Map View & Overlays */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
              showHeatmap
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300'
                : 'bg-slate-50 dark:bg-[#070B14] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Heatmap
          </button>
          <button
            type="button"
            onClick={() => setShowMonitoringPoints(!showMonitoringPoints)}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
              showMonitoringPoints
                ? 'bg-teal-500/15 border-teal-500/40 text-teal-700 dark:text-teal-300'
                : 'bg-slate-50 dark:bg-[#070B14] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            52 Sensors
          </button>
          <div className="flex items-center bg-slate-100 dark:bg-[#070B14] p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            {(['standard', 'satellite', 'terrain'] as const).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setMapStyle(style)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg capitalize transition-colors whitespace-nowrap shrink-0 ${
                  mapStyle === style
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Map + Side Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left/Center Map Canvas (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden relative min-h-[560px] flex flex-col shadow-sm">
          {/* Quick Zone Selector Strip */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#070B14]/90 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
              ZONES:
            </span>
            {zones.map((z) => {
              const isSel = selectedZone.id === z.id;
              return (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => handleZoneClick(z)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    isSel
                      ? 'bg-cyan-500/20 border border-cyan-500 text-slate-900 dark:text-white font-bold'
                      : 'bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getRiskColor(z.riskLevel) }}
                  />
                  <span>{z.id}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    ({z.riskScore})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Map Viewport */}
          <div className="relative flex-1 w-full" style={{ height: '510px' }}>
            {googleMapsApiKey ? (
              <APIProvider apiKey={googleMapsApiKey}>
                <GoogleMap
                  style={{ width: '100%', height: '100%' }}
                  defaultCenter={mapCenter}
                  defaultZoom={mapZoom}
                  mapId="DEMO_MAP_ID"
                  mapTypeId={
                    mapStyle === 'satellite'
                      ? 'satellite'
                      : mapStyle === 'terrain'
                      ? 'terrain'
                      : 'roadmap'
                  }
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  gestureHandling="greedy"
                >
                  {filteredZones.map((zone) => (
                    <AdvancedMarker
                      key={zone.id}
                      position={{ lat: zone.lat, lng: zone.lng }}
                      onClick={() => handleZoneClick(zone)}
                    >
                      <div
                        className={`px-2.5 py-1 rounded-lg border shadow-lg cursor-pointer flex items-center gap-1.5 font-mono text-xs ${
                          selectedZone.id === zone.id
                            ? 'bg-slate-950 border-white text-white scale-110'
                            : 'bg-slate-900/95 border-slate-700 text-slate-100'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: getRiskColor(zone.riskLevel) }}
                        />
                        <span className="font-bold">{zone.id}</span>
                        <span>{getLayerValueText(zone)}</span>
                      </div>
                    </AdvancedMarker>
                  ))}
                </GoogleMap>
              </APIProvider>
            ) : (
              <MapContainer
                center={[mapCenter.lat, mapCenter.lng]}
                zoom={mapZoom}
                style={{
                  width: '100%',
                  height: '510px',
                  background: themeMode === 'light' ? '#F1F5F9' : '#070B14',
                }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url={tileUrl}
                />
                <LeafletMapRecenter lat={mapCenter.lat} lng={mapCenter.lng} zoom={mapZoom} />

                {showHeatmap &&
                  filteredZones.map((zone) => (
                    <Circle
                      key={`heat-${zone.id}`}
                      center={[zone.lat, zone.lng]}
                      radius={zone.riskScore * 65}
                      pathOptions={{
                        color: getRiskColor(zone.riskLevel),
                        fillColor: getRiskColor(zone.riskLevel),
                        fillOpacity: selectedZone.id === zone.id ? 0.32 : 0.18,
                        weight: selectedZone.id === zone.id ? 2 : 1,
                      }}
                      eventHandlers={{
                        click: () => handleZoneClick(zone),
                      }}
                    />
                  ))}

                {filteredSensors.map((sensor) => (
                  <CircleMarker
                    key={sensor.id}
                    center={[sensor.lat, sensor.lng]}
                    radius={4}
                    pathOptions={{
                      color: sensor.status === 'OFFLINE' ? '#64748B' : '#06B6D4',
                      fillColor:
                        sensor.status === 'OFFLINE'
                          ? '#475569'
                          : getRiskColor(sensor.riskLevel),
                      fillOpacity: 0.9,
                      weight: 1.5,
                    }}
                  >
                    <Popup>
                      <div className="text-xs font-sans text-slate-900 space-y-1 min-w-[160px]">
                        <div className="font-bold font-mono flex items-center justify-between">
                          <span>{sensor.id}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200">
                            {sensor.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600">{sensor.zoneName}</div>
                        <div className="font-mono text-[11px] pt-1 border-t border-slate-200 space-y-0.5">
                          <div>Groundwater: {sensor.groundwaterLevel} m</div>
                          <div>Extraction: {sensor.extractionRate.toLocaleString()} L/d</div>
                          <div>Rainfall: {sensor.rainfall} mm</div>
                          <div>Risk Score: {sensor.riskScore}/100</div>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {filteredZones.map((zone) => (
                  <CircleMarker
                    key={zone.id}
                    center={[zone.lat, zone.lng]}
                    radius={selectedZone.id === zone.id ? 12 : 9}
                    pathOptions={{
                      color: selectedZone.id === zone.id ? '#FFFFFF' : '#0F172A',
                      fillColor: getRiskColor(zone.riskLevel),
                      fillOpacity: 1,
                      weight: selectedZone.id === zone.id ? 3 : 2,
                    }}
                    eventHandlers={{
                      click: () => handleZoneClick(zone),
                    }}
                  >
                    <Popup>
                      <div className="text-xs font-sans text-slate-900 space-y-1">
                        <div className="font-bold">{zone.name}</div>
                        <div className="font-mono">
                          Level: {zone.groundwaterLevel} m · Risk: {zone.riskScore}/100 (
                          {zone.riskLevel})
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            )}

            {/* Map Legend Overlay */}
            <div className="absolute bottom-3 left-3 z-[400] bg-white/95 dark:bg-[#070B14]/90 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-[11px] flex flex-wrap items-center gap-3 shadow-md">
              <span className="font-mono text-slate-500 dark:text-slate-400">RISK STATES:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">🟢 Low (0–25)</span>
              <span className="text-amber-600 dark:text-amber-400 font-medium">🟡 Moderate (26–50)</span>
              <span className="text-orange-600 dark:text-orange-400 font-medium">🟠 High (51–75)</span>
              <span className="text-rose-600 dark:text-rose-400 font-semibold">🔴 Critical (76–100)</span>
            </div>
          </div>
        </div>

        {/* Right Detailed Zone Intelligence Side Panel (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-sm">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs font-mono font-semibold text-cyan-600 dark:text-cyan-400 uppercase">
                  SELECTED HYDROGEOLOGICAL ZONE
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedZone.name}
                </h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  Coords: {selectedZone.lat.toFixed(4)}° N, {selectedZone.lng.toFixed(4)}° E
                </div>
              </div>
              <div className="text-right shrink-0">
                <div
                  className={`text-xs font-mono font-bold ${
                    selectedZone.riskLevel === 'CRITICAL'
                      ? 'text-rose-600 dark:text-rose-400'
                      : selectedZone.riskLevel === 'HIGH'
                      ? 'text-orange-600 dark:text-orange-400'
                      : selectedZone.riskLevel === 'MODERATE'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {getRiskLabelBadge(selectedZone.riskLevel)}
                </div>
                <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                  {selectedZone.riskScore}
                  <span className="text-xs text-slate-500 font-normal">/100</span>
                </div>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070B14] border border-slate-200 dark:border-slate-800/80">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Groundwater Level</div>
                <div className="text-lg font-mono font-bold text-cyan-600 dark:text-cyan-400 tabular-nums mt-0.5">
                  {selectedZone.groundwaterLevel} m
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  Historical: {selectedZone.historicalLevel} m
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070B14] border border-slate-200 dark:border-slate-800/80">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Water-Table Trend</div>
                <div
                  className={`text-sm font-semibold mt-1 ${
                    selectedZone.trend.includes('Declining')
                      ? 'text-rose-600 dark:text-rose-400'
                      : selectedZone.trend === 'Recovering'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-cyan-600 dark:text-cyan-300'
                  }`}
                >
                  {selectedZone.trend}
                </div>
                <div className="text-[10px] font-mono text-slate-500 tabular-nums">
                  Rate: -{selectedZone.declineRatePerMonth} m/mo
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070B14] border border-slate-200 dark:border-slate-800/80">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Extraction Pressure</div>
                <div className="text-base font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
                  {selectedZone.extractionPressurePct >= 38
                    ? 'High'
                    : selectedZone.extractionPressurePct >= 25
                    ? 'Moderate'
                    : 'Low'}{' '}
                  ({selectedZone.extractionPressurePct}%)
                </div>
                <div className="text-[10px] font-mono text-slate-500 tabular-nums">
                  {selectedZone.extractionRate.toLocaleString()} L/day avg
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070B14] border border-slate-200 dark:border-slate-800/80">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Estimated Recharge Index
                </div>
                <div className="text-base font-mono font-bold text-teal-600 dark:text-teal-400 tabular-nums mt-0.5">
                  {selectedZone.estimatedRechargeIndexPct <= 15
                    ? 'Low'
                    : selectedZone.estimatedRechargeIndexPct <= 25
                    ? 'Moderate'
                    : 'Healthy'}{' '}
                  ({selectedZone.estimatedRechargeIndexPct}%)
                </div>
                <div className="text-[10px] font-mono text-slate-500 tabular-nums">
                  Rainfall: {selectedZone.rainfallMm} mm
                </div>
              </div>
            </div>

            {/* 30 / 60 / 90 Day Forecast Strip */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070B14] border border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                <span>AI Depletion Forecast (Depth)</span>
                <span className="font-mono text-[10px] text-cyan-600 dark:text-cyan-400">
                  DEMO MODEL
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono tabular-nums">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">30 Days</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {selectedZone.forecast30d} m
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">60 Days</div>
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-300">
                    {selectedZone.forecast60d} m
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">90 Days</div>
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    {selectedZone.forecast90d} m
                  </div>
                </div>
              </div>
            </div>

            {/* AI Explanation Box */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 flex items-center justify-between">
                <span>AI Hydrogeological Explanation</span>
                <span className="text-[10px] font-mono text-slate-400">SIMULATED</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                “{selectedZone.aiExplanation}”
              </p>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 text-[11px] text-teal-700 dark:text-teal-300">
                <strong className="text-slate-900 dark:text-slate-200">Recommended Action:</strong>{' '}
                {selectedZone.recommendation}
              </div>
            </div>

            {/* Google Maps Grounding Live Context Button */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleRunMapsGrounding}
                disabled={groundingLoading}
                className="w-full py-2.5 px-3 rounded-xl bg-cyan-50 dark:bg-slate-900 hover:bg-cyan-100 dark:hover:bg-slate-800 border border-cyan-500/30 text-xs font-semibold text-cyan-700 dark:text-cyan-300 flex items-center justify-center gap-2 transition-colors"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>
                  {groundingLoading
                    ? 'Querying Google Maps Grounding...'
                    : 'Fetch Live Google Maps Geographic Grounding'}
                </span>
              </button>

              {groundingResult && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070B14] border border-cyan-500/30 text-xs space-y-2 max-h-44 overflow-y-auto">
                  <div className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
                    GOOGLE MAPS GROUNDING INSIGHT:
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-xs whitespace-pre-line leading-relaxed">
                    {groundingResult.text}
                  </p>
                  {groundingResult.links.length > 0 && (
                    <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="text-[10px] font-mono text-slate-500">
                        Verified Google Maps Places & Sources:
                      </div>
                      {groundingResult.links.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline truncate"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{link.title}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Navigation Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onNavigateTab('predictions')}
              className="py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors flex items-center justify-center gap-1 whitespace-nowrap shrink-0"
            >
              <span>AI Forecast</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('simulation')}
              className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs transition-colors flex items-center justify-center gap-1 whitespace-nowrap shrink-0"
            >
              <span>Simulate Stress</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

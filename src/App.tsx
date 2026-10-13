import React, { useState, useEffect, useMemo } from 'react';
import {
  Home,
  LayoutDashboard,
  Map as MapIcon,
  Radio,
  TrendingUp,
  BarChart3,
  CloudRain,
  Bell,
  Sliders,
  MessageSquare,
  CheckCircle2,
  Cpu,
  Info,
  Database,
  Search,
  Download,
  FileText,
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Droplets,
  Thermometer,
  Wind,
  Cloud,
  Battery,
  Wifi,
  ExternalLink,
  Check,
  Send,
  Trash2,
  Bookmark,
  Menu,
  X,
  Zap,
  Globe,
  Layers,
  ShieldAlert,
  Sun,
  Moon,
  ChevronDown,
  Sparkles,
  Clock,
  Compass,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import { HydroSightLogo } from './components/HydroSightLogo';
import { Underground3DView } from './components/Underground3DView';
import { LiveGroundwaterMap } from './components/LiveGroundwaterMap';
import { AIAssistantWidget } from './components/AIAssistantWidget';
import {
  SimulationScenario,
  ZoneData,
  SensorNode,
  AlertItem,
  MONTHLY_TIMELINE,
  WEATHER_FORECAST_7DAY,
  ARCHITECTURE_NODES,
  computeScenarioState,
  generateSensorNetwork,
  calculatePrototypeRiskScore,
} from './data/hydroData';
import {
  initAuth,
  googleSignIn,
  logout,
  PROJECT_ID,
  saveSimulationToFirestore,
  deleteSimulationFromFirestore,
  logAlertAckToFirestore,
  subscribeUserSimulations,
  subscribeUserAlertAcks,
  SavedSimulationRecord,
  AlertAckRecord,
  fetchGoogleTasks,
  createGoogleTask,
  fetchGoogleChatSpaces,
  sendGoogleChatMessage,
  GoogleTaskItem,
  GoogleChatSpace,
} from './firebase';

// Import custom-generated high-resolution hydrogeological visual assets
import heroAquiferImg from './assets/images/hero_aquifer_intelligence_1791610576742.jpg';
import iotBorewellImg from './assets/images/iot_borewell_station_1791610589187.jpg';
import rechargeBasinImg from './assets/images/recharge_harvesting_basin_1791610624709.jpg';
import satelliteGisImg from './assets/images/satellite_gis_watershed_1791610605363.jpg';

export type NavTabId =
  | 'home'
  | 'dashboard'
  | 'map'
  | 'monitoring'
  | 'predictions'
  | 'analytics'
  | 'weather'
  | 'alerts'
  | 'simulation'
  | 'assistant'
  | 'recommendations'
  | 'architecture'
  | 'about'
  | 'methodology';

const NAV_TABS: {
  id: NavTabId;
  label: string;
  shortLabel?: string;
  category: 'primary' | 'operations' | 'intelligence';
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}[] = [
  { id: 'home', label: 'Home', category: 'primary', icon: Home, desc: 'Platform overview & 3D aquifer system' },
  { id: 'dashboard', label: 'Dashboard', category: 'primary', icon: LayoutDashboard, desc: 'Real-time KPIs & command center' },
  { id: 'map', label: 'Live Groundwater Map', shortLabel: 'Live GIS Map', category: 'primary', icon: MapIcon, desc: 'Interactive spatial risk & sensor layers' },
  { id: 'predictions', label: 'AI Predictions', category: 'primary', icon: TrendingUp, desc: '30/60/90-day water table forecasts' },
  { id: 'simulation', label: 'Simulation Lab', category: 'primary', icon: Sliders, desc: 'Interactive what-if stress testing' },
  { id: 'monitoring', label: 'Monitoring', category: 'operations', icon: Radio, desc: '52 IoT piezometer telemetry nodes' },
  { id: 'analytics', label: 'Analytics', category: 'operations', icon: BarChart3, desc: 'Multi-variable hydrogeological trends' },
  { id: 'weather', label: 'Weather', category: 'operations', icon: CloudRain, desc: 'Precipitation & recharge impact' },
  { id: 'alerts', label: 'Alerts', category: 'operations', icon: ShieldAlert, desc: 'Early warnings & live countdowns' },
  { id: 'recommendations', label: 'Recommendations', category: 'intelligence', icon: CheckCircle2, desc: 'Preventive conservation directives' },
  { id: 'assistant', label: 'AI Assistant', category: 'intelligence', icon: MessageSquare, desc: 'Google Search & GIS grounded co-pilot' },
  { id: 'architecture', label: 'Architecture', category: 'intelligence', icon: Cpu, desc: 'End-to-end IoT to AI pipeline' },
  { id: 'about', label: 'About HydroSight', category: 'intelligence', icon: Info, desc: 'Mission, impact & SDG alignment' },
  { id: 'methodology', label: 'Data & Methodology', category: 'intelligence', icon: Database, desc: 'Risk scoring math & transparency' },
];

interface TourStepConfig {
  step: number;
  tab: NavTabId;
  title: string;
  subtitle: string;
  description: string;
  highlightMetric: string;
  scenarioOverride?: SimulationScenario;
  enableIotStream?: boolean;
  selectZoneId?: string;
}

const GUIDED_TOUR_STEPS: TourStepConfig[] = [
  {
    step: 1,
    tab: 'home',
    title: 'Welcome to HydroSight AI Command Platform',
    subtitle: '3D Subsurface Aquifer Intelligence & Live Telemetry Status',
    description:
      'Explore the interactive 3D underground stratigraphy model and live status across 52 monitoring points (47 active piezometers). Rotate the 3D cutaway to inspect soil horizons, borewells, and the phreatic water table.',
    highlightMetric: '52 Monitoring Points · 98.4% System Health',
    scenarioOverride: 'Normal Conditions',
    selectZoneId: 'ZONE-D',
  },
  {
    step: 2,
    tab: 'dashboard',
    title: 'Executive Command Center & Risk Engine',
    subtitle: 'Real-Time Hydrogeological KPIs & Multi-Factor Risk Breakdown',
    description:
      'Review regional groundwater depth (36.8 m baseline), extraction vs. recharge balance, and the transparent 0–100 Prototype Risk Score across all 8 aquifer zones.',
    highlightMetric: 'Avg Depth: 36.8 m · Avg Risk Score: 61/100',
    scenarioOverride: 'Normal Conditions',
  },
  {
    step: 3,
    tab: 'map',
    title: 'Live GIS Groundwater Map & Spatial Hotspots',
    subtitle: 'Zone D Critical Cone of Depression & Google Maps Grounding',
    description:
      'Inspect spatial risk layers, toggle between Risk, Groundwater Depth, Rainfall, and Recharge overlays, and examine Zone D (Risk Score 82/100 — CRITICAL). Run live Google Maps Grounding for catchment context.',
    highlightMetric: 'Zone D Depth: 41.2 m · Status: CRITICAL (82/100)',
    selectZoneId: 'ZONE-D',
  },
  {
    step: 4,
    tab: 'monitoring',
    title: '52-Node IoT Piezometer Sensor Network',
    subtitle: 'Live Submersible Telemetry Stream Activated',
    description:
      'We have automatically enabled the Live IoT Stream! Watch real-time hydrostatic depth, flow rate, soil moisture, and battery telemetry update across sensors HYD-001 through HYD-052.',
    highlightMetric: '47 Online · 5 Maintenance (including HYD-014)',
    enableIotStream: true,
  },
  {
    step: 5,
    tab: 'predictions',
    title: '30 / 60 / 90-Day AI Groundwater Forecasting',
    subtitle: 'Predictive Drawdown Trajectories & 95% Confidence Bands',
    description:
      'Traditional monitoring only reports past water levels. HydroSight AI projects Zone D declining from 41.2 m today to 44.8 m over the next 90 days if current extraction persists.',
    highlightMetric: 'Zone D 90-Day Forecast: 44.8 m (-3.6 m drawdown)',
    selectZoneId: 'ZONE-D',
  },
  {
    step: 6,
    tab: 'analytics',
    title: 'Multi-Variable Hydro-Climatic Analytics',
    subtitle: 'Extraction Pressure (37%) vs. Estimated Recharge Index (18%)',
    description:
      'Analyze the 12-month correlation between rainfall deficits, commercial/agricultural pumping, and aquifer recharge stress, revealing a 19% regional recharge deficit.',
    highlightMetric: 'Recharge Deficit: 19% · Peak Stress: Oct',
  },
  {
    step: 7,
    tab: 'alerts',
    title: 'Early Warning Timeline & Live Depletion Countdowns',
    subtitle: 'Real-Time Timestamps, Threshold Countdowns & Workspace Dispatch',
    description:
      'Every alert features verified real-time timestamps, live ticking countdowns to critical borewell intake thresholds, and 1-click dispatch to Google Chat and Google Tasks.',
    highlightMetric: '4 Active Early Warnings · Live Threshold Countdowns',
  },
  {
    step: 8,
    tab: 'simulation',
    title: 'Interactive What-If Stress Simulation Lab',
    subtitle: 'Auto-Applying "Extreme Groundwater Stress" Scenario',
    description:
      'Watch the entire platform respond as we switch to "Extreme Groundwater Stress". Adjust custom sliders for rainfall, extraction, and recharge to test resilience before a drought hits.',
    highlightMetric: 'Scenario: Extreme Groundwater Stress Active',
    scenarioOverride: 'Extreme Groundwater Stress',
  },
  {
    step: 9,
    tab: 'recommendations',
    title: 'Preventive Action Directives & Search-Grounded AI',
    subtitle: 'From Early Warning to Concrete Field Intervention',
    description:
      'Review prioritized hydrogeological interventions and open the Google Search-connected HydroSight AI Assistant to ask any question or inspect field borewell photos.',
    highlightMetric: 'Complete 9-Step Product Tour Finished',
    scenarioOverride: 'Normal Conditions',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTabId>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<'operations' | 'intelligence' | null>(null);

  // Theme Mode ('dark' | 'light') with clean default and persistence
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('hydrosight_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('hydrosight_theme', themeMode);
  }, [themeMode]);

  // Live Ticking System Clock for accurate Dates, Times & Countdowns
  const [liveNow, setLiveNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulation & Timeline State (Connected across the entire platform)
  const [scenario, setScenario] = useState<SimulationScenario>('Normal Conditions');
  const [monthIndex, setMonthIndex] = useState<number>(4); // May default (36.8m, Risk 61)
  const [simRunning, setSimRunning] = useState<boolean>(false);
  const [iotStreamActive, setIotStreamActive] = useState<boolean>(false);
  const [iotJitter, setIotJitter] = useState<number>(0);

  // Interactive 9-Step Guided Demo Tour State
  const [tourStepIndex, setTourStepIndex] = useState<number | null>(null);
  const [tourAutoPlay, setTourAutoPlay] = useState<boolean>(false);
  const [tourProgressPct, setTourProgressPct] = useState<number>(0);

  // Floating AI Assistant Drawer control
  const [assistantPopupOpen, setAssistantPopupOpen] = useState<boolean>(false);

  // Compute global scenario state
  const systemState = useMemo(
    () => computeScenarioState(scenario, monthIndex),
    [scenario, monthIndex]
  );

  const [selectedZoneId, setSelectedZoneId] = useState<string>('ZONE-D');
  const selectedZone = useMemo(
    () =>
      systemState.zones.find((z) => z.id === selectedZoneId) ||
      systemState.zones[3] ||
      systemState.zones[0],
    [systemState.zones, selectedZoneId]
  );

  const sensors = useMemo(
    () => generateSensorNetwork(systemState.zones, iotJitter),
    [systemState.zones, iotJitter]
  );

  // Search Modal (Command Palette), Notifications, Modals, and Toasts
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [showNotifBell, setShowNotifBell] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedSensorModal, setSelectedSensorModal] = useState<SensorNode | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<
    '7 Days' | '30 Days' | '90 Days' | '6 Months' | '1 Year'
  >('90 Days');
  const [selectedArchNode, setSelectedArchNode] = useState(ARCHITECTURE_NODES[0]);

  // Firebase Auth & Firestore Persistence State
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [savedSimulations, setSavedSimulations] = useState<SavedSimulationRecord[]>([]);
  const [alertAcks, setAlertAcks] = useState<AlertAckRecord[]>([]);
  const [simNotesInput, setSimNotesInput] = useState('');

  // Google Workspace (Tasks & Chat) State + Mandatory Confirmation Modal
  const [googleTasks, setGoogleTasks] = useState<GoogleTaskItem[]>([]);
  const [chatSpaces, setChatSpaces] = useState<GoogleChatSpace[]>([]);
  const [selectedChatSpace, setSelectedChatSpace] = useState<string>('');
  const [chatErrorMsg, setChatErrorMsg] = useState<string | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  // Mandatory User Confirmation Dialog state for Workspace mutations
  const [workspaceConfirmModal, setWorkspaceConfirmModal] = useState<{
    type: 'create_task' | 'send_chat' | 'delete_sim';
    title: string;
    description: string;
    payload: any;
  } | null>(null);

  // Low-latency AI quick brief on Dashboard
  const [fastAiBrief, setFastAiBrief] = useState<string | null>(null);
  const [fastAiLoading, setFastAiLoading] = useState(false);

  // Quota exceeded listener for Google Maps Platform
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuota = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Keyboard shortcut Cmd+K / Ctrl+K for Search Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setSearchModalOpen(false);
        setOpenDropdown(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4200);
  };

  // Smooth navigation helper
  const navigateToTab = (tab: NavTabId) => {
    setActiveTab(tab);
    setOpenDropdown(null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Interactive 9-Step Guided Demo Controller
  const applyTourStep = (idx: number) => {
    const stepCfg = GUIDED_TOUR_STEPS[idx];
    if (!stepCfg) return;
    setTourStepIndex(idx);
    setTourProgressPct(0);
    setActiveTab(stepCfg.tab);
    if (stepCfg.scenarioOverride) {
      setScenario(stepCfg.scenarioOverride);
    }
    if (stepCfg.enableIotStream !== undefined) {
      setIotStreamActive(stepCfg.enableIotStream);
    }
    if (stepCfg.selectZoneId) {
      setSelectedZoneId(stepCfg.selectZoneId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startInteractiveDemoTour = () => {
    setTourAutoPlay(true);
    applyTourStep(0);
    triggerToast('Interactive 9-Step Guided Demo Started — Auto-guiding through HydroSight AI.');
  };

  const stopInteractiveDemoTour = () => {
    setTourStepIndex(null);
    setTourAutoPlay(false);
    setTourProgressPct(0);
  };

  // Auto-advance timer for the 9-Step Guided Tour
  useEffect(() => {
    if (tourStepIndex === null || !tourAutoPlay) return;
    const interval = setInterval(() => {
      setTourProgressPct((prev) => {
        if (prev >= 100) {
          if (tourStepIndex < GUIDED_TOUR_STEPS.length - 1) {
            applyTourStep(tourStepIndex + 1);
          } else {
            setTourAutoPlay(false);
            triggerToast('9-Step Guided Product Demo Completed! Feel free to explore any module.');
          }
          return 0;
        }
        return prev + 2.5; // ~8 seconds per step
      });
    }, 200);
    return () => clearInterval(interval);
  }, [tourStepIndex, tourAutoPlay]);

  // Initialize Firebase Auth & Firestore Subscriptions
  useEffect(() => {
    let unsubSims: (() => void) | null = null;
    let unsubAcks: (() => void) | null = null;

    const unsubAuth = initAuth(
      (loggedInUser, token) => {
        setUser(loggedInUser);
        if (token) setAccessToken(token);

        if (unsubSims) unsubSims();
        if (unsubAcks) unsubAcks();

        if (loggedInUser) {
          unsubSims = subscribeUserSimulations(loggedInUser.uid, (records) =>
            setSavedSimulations(records)
          );
          unsubAcks = subscribeUserAlertAcks(loggedInUser.uid, (records) =>
            setAlertAcks(records)
          );
        } else {
          setSavedSimulations([]);
          setAlertAcks([]);
        }
      },
      () => {
        setUser(null);
        setSavedSimulations([]);
        setAlertAcks([]);
      }
    );

    return () => {
      unsubAuth();
      if (unsubSims) unsubSims();
      if (unsubAcks) unsubAcks();
    };
  }, []);

  // Load Google Tasks and Chat Spaces when accessToken is available
  useEffect(() => {
    if (!accessToken) return;
    let mounted = true;
    fetchGoogleTasks(accessToken)
      .then((items) => {
        if (mounted) setGoogleTasks(items);
      })
      .catch(() => {});

    fetchGoogleChatSpaces(accessToken)
      .then((spaces) => {
        if (mounted) {
          setChatSpaces(spaces);
          if (spaces.length > 0) setSelectedChatSpace(spaces[0].name);
          setChatErrorMsg(null);
        }
      })
      .catch((err) => {
        if (mounted) setChatErrorMsg(err.message);
      });

    return () => {
      mounted = false;
    };
  }, [accessToken]);

  // Month-by-Month Timeline Playback Timer
  useEffect(() => {
    if (!simRunning) return;
    const interval = setInterval(() => {
      setMonthIndex((prev) => (prev + 1) % MONTHLY_TIMELINE.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [simRunning]);

  // Live IoT Telemetry Stream Jitter Timer
  useEffect(() => {
    if (!iotStreamActive) {
      setIotJitter(0);
      return;
    }
    const interval = setInterval(() => {
      setIotJitter(Number((Math.sin(Date.now() / 1200) * 0.8).toFixed(2)));
    }, 2000);
    return () => clearInterval(interval);
  }, [iotStreamActive]);

  // Custom Simulation Lab Sliders (Synchronized with selected scenario)
  const [simRainSlider, setSimRainSlider] = useState<number>(45);
  const [simExtSlider, setSimExtSlider] = useState<number>(62);
  const [simRechSlider, setSimRechSlider] = useState<number>(28);
  const [simTempSlider, setSimTempSlider] = useState<number>(32);
  const [simSoilSlider, setSimSoilSlider] = useState<number>(34);
  const [simDeclineSlider, setSimDeclineSlider] = useState<number>(0.65);

  useEffect(() => {
    switch (scenario) {
      case 'High Extraction':
        setSimRainSlider(35);
        setSimExtSlider(84);
        setSimRechSlider(19);
        setSimTempSlider(34);
        setSimSoilSlider(26);
        setSimDeclineSlider(0.88);
        break;
      case 'Low Rainfall':
        setSimRainSlider(14);
        setSimExtSlider(68);
        setSimRechSlider(15);
        setSimTempSlider(36);
        setSimSoilSlider(19);
        setSimDeclineSlider(0.79);
        break;
      case 'Low Recharge':
        setSimRainSlider(28);
        setSimExtSlider(65);
        setSimRechSlider(11);
        setSimTempSlider(33);
        setSimSoilSlider(22);
        setSimDeclineSlider(0.74);
        break;
      case 'Extreme Groundwater Stress':
        setSimRainSlider(10);
        setSimExtSlider(92);
        setSimRechSlider(9);
        setSimTempSlider(39);
        setSimSoilSlider(14);
        setSimDeclineSlider(1.15);
        break;
      case 'Recovery After Rainfall':
        setSimRainSlider(88);
        setSimExtSlider(34);
        setSimRechSlider(54);
        setSimTempSlider(26);
        setSimSoilSlider(64);
        setSimDeclineSlider(0.12);
        break;
      case 'Normal Conditions':
      default:
        setSimRainSlider(48);
        setSimExtSlider(54);
        setSimRechSlider(28);
        setSimTempSlider(30);
        setSimSoilSlider(38);
        setSimDeclineSlider(0.45);
        break;
    }
  }, [scenario]);

  // Derived Simulation Lab output
  const simLabOutput = useMemo(() => {
    const baseDepth = 36.8;
    const estDepth = Number(
      Math.max(
        18,
        baseDepth +
          (simExtSlider - 50) * 0.09 -
          (simRainSlider - 45) * 0.06 -
          (simRechSlider - 28) * 0.07 +
          simDeclineSlider * 2.4
      ).toFixed(1)
    );

    const calc = calculatePrototypeRiskScore({
      groundwaterLevel: estDepth,
      historicalLevel: 31.5,
      extractionPressurePct: Math.round(simExtSlider * 0.65),
      rainfallMm: simRainSlider * 1.1,
      estimatedRechargeIndexPct: Math.round(simRechSlider * 0.7),
    });

    const f30 = Number((estDepth + simDeclineSlider * 1.1 - simRechSlider * 0.015).toFixed(1));
    const f60 = Number((estDepth + simDeclineSlider * 2.2 - simRechSlider * 0.03).toFixed(1));
    const f90 = Number((estDepth + simDeclineSlider * 3.4 - simRechSlider * 0.045).toFixed(1));

    let actionText =
      'Maintain baseline piezometric telemetry and standard seasonal recharge maintenance.';
    if (calc.level === 'CRITICAL') {
      actionText =
        'CRITICAL INTERVENTION: Enforce immediate borewell extraction caps, activate emergency percolation basins, and increase sensor polling to 5-minute intervals.';
    } else if (calc.level === 'HIGH') {
      actionText =
        'HIGH PRIORITY: Review commercial & agricultural groundwater extraction schedules and deploy rainwater harvesting recharge shafts.';
    } else if (calc.level === 'MODERATE') {
      actionText =
        'ADVISORY: Increase monitoring frequency and prepare micro-irrigation water-conservation measures.';
    }

    return {
      estDepth,
      riskScore: calc.score,
      riskLevel: calc.level,
      factors: calc.factors,
      f30,
      f60,
      f90,
      actionText,
    };
  }, [simRainSlider, simExtSlider, simRechSlider, simTempSlider, simSoilSlider, simDeclineSlider]);

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      'Zone ID',
      'Zone Name',
      'Region',
      'Current Depth (m)',
      'Trend',
      'Extraction Rate (L/day)',
      'Extraction Pressure (%)',
      'Rainfall (mm)',
      'Soil Moisture (%)',
      'Est. Recharge Index (%)',
      'Risk Score (0-100)',
      'Risk Status',
      '30-Day Forecast (m)',
      '60-Day Forecast (m)',
      '90-Day Forecast (m)',
    ];
    const rows = systemState.zones.map((z) => [
      z.id,
      `"${z.name}"`,
      `"${z.region}"`,
      z.groundwaterLevel,
      z.trend,
      z.extractionRate,
      z.extractionPressurePct,
      z.rainfallMm,
      z.soilMoisturePct,
      z.estimatedRechargeIndexPct,
      z.riskScore,
      z.riskLevel,
      z.forecast30d,
      z.forecast60d,
      z.forecast90d,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `HydroSight_AI_Telemetry_${scenario.replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Exported HydroSight AI CSV dataset successfully.');
  };

  // Fast Low-Latency AI Brief using gemini-3.1-flash-lite
  const handleGenerateFastBrief = async () => {
    setFastAiLoading(true);
    try {
      const res = await fetch('/api/ai/fast-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Provide a 2-sentence executive status brief for scenario "${scenario}" in ${MONTHLY_TIMELINE[monthIndex].month}, highlighting Zone D (${selectedZone.groundwaterLevel}m, Risk ${selectedZone.riskScore}/100).`,
          contextData: `Avg Depth: ${systemState.kpis.avgDepth}m, Avg Risk: ${systemState.kpis.avgRiskScore}/100, Critical Zones: ${systemState.kpis.criticalZones}, Est Recharge: ${systemState.kpis.estimatedRechargeIndex}%`,
        }),
      });
      const data = await res.json();
      setFastAiBrief(data.text);
    } catch {
      setFastAiBrief(
        `Under ${scenario} (${MONTHLY_TIMELINE[monthIndex].month}), regional groundwater depth averages ${systemState.kpis.avgDepth} m with a prototype risk score of ${systemState.kpis.avgRiskScore}/100. Immediate recharge and extraction management is advised for Zone D (Demonstration Dataset).`
      );
    } finally {
      setFastAiLoading(false);
    }
  };

  // Handle Google Sign-In
  const handleSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        if (res.accessToken) setAccessToken(res.accessToken);
        triggerToast(`Signed in as ${res.user.displayName || res.user.email}`);
      }
    } catch (err: any) {
      triggerToast(`Sign-in cancelled or failed: ${err?.message || 'Check popup permissions'}`);
    }
  };

  // Save Simulation to Firestore
  const handleSaveSimulation = async () => {
    if (!user) {
      triggerToast('Please sign in with Google in the top bar to save simulation snapshots.');
      return;
    }
    try {
      await saveSimulationToFirestore(
        scenario,
        MONTHLY_TIMELINE[monthIndex].month,
        simLabOutput.estDepth,
        simLabOutput.riskScore,
        simNotesInput.trim() ||
          `Saved under ${MONTHLY_TIMELINE[monthIndex].month} timeline (${simLabOutput.f90}m 90d forecast).`
      );
      setSimNotesInput('');
      triggerToast('Simulation snapshot saved to Firestore.');
    } catch (err: any) {
      triggerToast(`Failed to save simulation: ${err.message}`);
    }
  };

  // Acknowledge Alert in Firestore
  const handleAcknowledgeAlert = async (alert: AlertItem) => {
    if (!user) {
      triggerToast('Sign in with Google to persist alert acknowledgements to Firestore.');
      return;
    }
    try {
      await logAlertAckToFirestore(
        alert.id,
        alert.zoneId,
        'acknowledged',
        `Operator acknowledged & initiated: ${alert.recommendedAction}`
      );
      triggerToast(`Alert ${alert.id} (${alert.zoneId}) acknowledged & logged.`);
    } catch (err: any) {
      triggerToast(`Failed to log acknowledgement: ${err.message}`);
    }
  };

  // Execute confirmed Workspace / Firestore action
  const executeConfirmedAction = async () => {
    if (!workspaceConfirmModal) return;
    setWorkspaceLoading(true);
    try {
      if (workspaceConfirmModal.type === 'create_task') {
        if (!accessToken) throw new Error('Please sign in with Google first.');
        const { title, notes } = workspaceConfirmModal.payload;
        await createGoogleTask(accessToken, title, notes);
        const updated = await fetchGoogleTasks(accessToken);
        setGoogleTasks(updated);
        triggerToast('Preventive action item created in Google Tasks!');
      } else if (workspaceConfirmModal.type === 'send_chat') {
        if (!accessToken) throw new Error('Please sign in with Google first.');
        const { spaceName, text } = workspaceConfirmModal.payload;
        await sendGoogleChatMessage(accessToken, spaceName, text);
        triggerToast('Emergency groundwater alert dispatched to Google Chat space!');
      } else if (workspaceConfirmModal.type === 'delete_sim') {
        await deleteSimulationFromFirestore(workspaceConfirmModal.payload.id);
        triggerToast('Saved simulation snapshot removed.');
      }
    } catch (err: any) {
      triggerToast(`Action failed: ${err.message}`);
    } finally {
      setWorkspaceLoading(false);
      setWorkspaceConfirmModal(null);
    }
  };

  // Global Search Results (Zones, Sensors, Navigation Tabs, Alerts)
  const searchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) {
      return {
        zones: systemState.zones.slice(0, 4),
        sensors: sensors.slice(0, 4),
        tabs: NAV_TABS.slice(0, 6),
      };
    }
    const matchedZones = systemState.zones.filter(
      (z) =>
        z.name.toLowerCase().includes(q) ||
        z.id.toLowerCase().includes(q) ||
        z.region.toLowerCase().includes(q)
    );
    const matchedSensors = sensors
      .filter((s) => s.id.toLowerCase().includes(q) || s.zoneName.toLowerCase().includes(q))
      .slice(0, 5);
    const matchedTabs = NAV_TABS.filter(
      (t) => t.label.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q)
    );
    return { zones: matchedZones, sensors: matchedSensors, tabs: matchedTabs };
  }, [globalSearch, systemState.zones, sensors]);

  // Helper for Risk Status Badges (Supports Light & Dark mode)
  const renderRiskBadge = (level: string, score?: number) => {
    const map: Record<string, string> = {
      CRITICAL:
        'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
      HIGH:
        'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
      MODERATE:
        'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      LOW:
        'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    };
    const dot: Record<string, string> = {
      CRITICAL: '🔴',
      HIGH: '🟠',
      MODERATE: '🟡',
      LOW: '🟢',
    };
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border whitespace-nowrap shrink-0 tabular-nums ${
          map[level] || map.LOW
        }`}
      >
        <span>{dot[level] || '🟢'}</span>
        <span>{level}</span>
        {score !== undefined && <span className="opacity-80">({score}/100)</span>}
      </span>
    );
  };

  // Dynamic Recharts styling for Light and Dark modes
  const chartColors = useMemo(
    () => ({
      grid: themeMode === 'dark' ? '#1E293B' : '#E2E8F0',
      axis: themeMode === 'dark' ? '#94A3B8' : '#64748B',
      tooltipBg: themeMode === 'dark' ? '#070B14' : '#FFFFFF',
      tooltipBorder: themeMode === 'dark' ? '#1E293B' : '#CBD5E1',
      tooltipText: themeMode === 'dark' ? '#F8FAFC' : '#0F172A',
    }),
    [themeMode]
  );

  // Live ticking countdown formatter for Alert cards
  const formatLiveCountdown = (daysToThreshold: number) => {
    // Derive hours, minutes, seconds from liveNow so the countdown ticks accurately in real time
    const hours = 23 - liveNow.getHours();
    const mins = 59 - liveNow.getMinutes();
    const secs = 59 - liveNow.getSeconds();
    return `${daysToThreshold}d ${String(hours).padStart(2, '0')}h ${String(mins).padStart(
      2,
      '0'
    )}m ${String(secs).padStart(2, '0')}s`;
  };

  const currentTourStep =
    tourStepIndex !== null ? GUIDED_TOUR_STEPS[tourStepIndex] : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#050912] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-700 dark:selection:text-cyan-200 transition-colors duration-300">
      {/* Top Toast Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-20 right-6 z-50 bg-white dark:bg-[#0B1221] border border-cyan-500/50 text-slate-900 dark:text-slate-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 max-w-md"
          >
            <CheckCircle2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span className="text-xs font-medium">{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white ml-auto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Google Maps Quota Warning Banner if triggered */}
      {gmpQuotaExceeded && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-center text-xs text-amber-800 dark:text-amber-300">
          Google Maps Platform Demo Key quota reached. Automatically serving fallback OpenStreetMap Hydrological GIS tiles.
        </div>
      )}

      {/* =====================================================================
          MODERN SINGLE-TIER COMMAND HEADER
      ===================================================================== */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#070B14]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Unified Brand Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigateToTab('home')}
              className="flex items-center gap-3 text-left group focus:outline-none"
            >
              <HydroSightLogo
                size={38}
                className="transition-transform duration-300 group-hover:scale-105"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                    HydroSight <span className="text-cyan-600 dark:text-cyan-400">AI</span>
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                    🟢 LIVE DEMO
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                  Predictive Groundwater Intelligence & Early Warning
                </p>
              </div>
            </button>
          </div>

          {/* Center: Clean Modern Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-1">
            {NAV_TABS.filter((t) => t.category === 'primary').map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => navigateToTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{tab.shortLabel || tab.label}</span>
                </button>
              );
            })}

            {/* Dropdown 1: Telemetry & Operations */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenDropdown(openDropdown === 'operations' ? null : 'operations')
                }
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  NAV_TABS.some((t) => t.category === 'operations' && t.id === activeTab)
                    ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Telemetry & Ops</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>
              {openDropdown === 'operations' && (
                <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50">
                  {NAV_TABS.filter((t) => t.category === 'operations').map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => navigateToTab(tab.id)}
                        className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-colors ${
                          isActive
                            ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-cyan-600 dark:text-cyan-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-xs font-bold flex items-center gap-2">
                            <span>{tab.label}</span>
                            {tab.id === 'alerts' && (
                              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded text-[10px] font-mono">
                                {systemState.alerts.length}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {tab.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dropdown 2: Intelligence & Docs */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenDropdown(openDropdown === 'intelligence' ? null : 'intelligence')
                }
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  NAV_TABS.some((t) => t.category === 'intelligence' && t.id === activeTab)
                    ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Intelligence & Docs</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>
              {openDropdown === 'intelligence' && (
                <div className="absolute right-0 mt-2 w-68 bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50">
                  {NAV_TABS.filter((t) => t.category === 'intelligence').map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => navigateToTab(tab.id)}
                        className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-colors ${
                          isActive
                            ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-cyan-600 dark:text-cyan-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-xs font-bold">{tab.label}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {tab.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Right Action Cluster: Search Trigger, Interactive 9-Step Demo, Theme Toggle, Alerts, Profile */}
          <div className="flex items-center gap-2">
            {/* Properly positioned Command Search button on the right */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-900/90 hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 transition-colors"
              title="Search Zones, Sensors, or Pages (⌘K)"
            >
              <Search className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span className="hidden sm:inline font-medium">Search</span>
              <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-800">
                ⌘K
              </kbd>
            </button>

            {/* Interactive 9-Step Guided Demo Button */}
            <button
              type="button"
              onClick={() =>
                tourStepIndex !== null ? stopInteractiveDemoTour() : startInteractiveDemoTour()
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                tourStepIndex !== null
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 shadow-sm'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{tourStepIndex !== null ? `Tour (${tourStepIndex + 1}/9)` : '9-Step Demo'}</span>
            </button>

            {/* Light / Dark Mode Theme Toggle */}
            <button
              type="button"
              onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-cyan-500/50 transition-colors"
              aria-label="Toggle Light or Dark Theme"
              title={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {themeMode === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Alerts Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifBell(!showNotifBell)}
                className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-cyan-500/50 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold flex items-center justify-center">
                  {systemState.alerts.length}
                </span>
              </button>

              {showNotifBell && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 z-50">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Active Early Warnings
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNotifBell(false);
                        navigateToTab('alerts');
                      }}
                      className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline"
                    >
                      Open Alert Center →
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {systemState.alerts.map((al) => (
                      <div
                        key={al.id}
                        onClick={() => {
                          setShowNotifBell(false);
                          navigateToTab('alerts');
                        }}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800/80 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                            {al.title}
                          </span>
                          <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 shrink-0">
                            {al.riskScore}/100
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                          {al.reason}
                        </p>
                        <div className="text-[10px] font-mono text-slate-400 mt-1">
                          {al.exactDateTime}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Google Sign-In / Operator Profile */}
            {user ? (
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                <img
                  src={
                    user.photoURL ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      user.displayName || 'Operator'
                    )}&background=0891b2&color=fff`
                  }
                  alt="Profile"
                  className="w-7 h-7 rounded-full border border-cyan-500/40"
                />
                <button
                  type="button"
                  onClick={() => logout().then(() => triggerToast('Signed out'))}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                className="gsi-material-button hidden sm:inline-flex"
              >
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      style={{ display: 'block' }}
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">Sign in</span>
                </div>
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Clean Module Switcher Strip + Live System Clock & Scenario Bar */}
        <div className="bg-slate-100/70 dark:bg-[#050912]/90 border-t border-slate-200/70 dark:border-slate-800/70">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-3">
            {/* Scrollable 14-Module Quick Pills for 1-click access */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => navigateToTab(tab.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{tab.shortLabel || tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right: Live Clock + Active Scenario Selector */}
            <div className="hidden lg:flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>
                  {liveNow.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  ·{' '}
                  {liveNow.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>

              <div className="h-3.5 w-px bg-slate-300 dark:bg-slate-800" />

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  Scenario:
                </span>
                <select
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value as SimulationScenario)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[11px] font-semibold text-cyan-700 dark:text-cyan-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Normal Conditions">Normal Conditions</option>
                  <option value="High Extraction">High Extraction</option>
                  <option value="Low Rainfall">Low Rainfall</option>
                  <option value="Low Recharge">Low Recharge</option>
                  <option value="Extreme Groundwater Stress">Extreme Groundwater Stress</option>
                  <option value="Recovery After Rainfall">Recovery After Rainfall</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-white dark:bg-[#0B1221] border-b border-slate-200 dark:border-slate-800 px-4 py-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => navigateToTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-left ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* =====================================================================
          INTERACTIVE 9-STEP GUIDED PRODUCT DEMO CONTROLLER BANNER
      ===================================================================== */}
      <AnimatePresence>
        {currentTourStep && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="bg-gradient-to-r from-cyan-950 via-slate-900 to-teal-950 text-white border-b border-cyan-500/40 shadow-xl relative overflow-hidden"
          >
            {/* Progress bar at top of tour banner */}
            <div className="h-1 w-full bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-200"
                style={{
                  width: `${
                    ((currentTourStep.step - 1) / GUIDED_TOUR_STEPS.length) * 100 +
                    tourProgressPct / GUIDED_TOUR_STEPS.length
                  }%`,
                }}
              />
            </div>

            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-cyan-500 text-slate-950 font-mono text-[11px] font-bold">
                    INTERACTIVE DEMO · STEP {currentTourStep.step} OF {GUIDED_TOUR_STEPS.length}
                  </span>
                  <span className="text-xs font-mono text-cyan-300 font-semibold">
                    {currentTourStep.subtitle}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/10 text-[11px] font-mono text-emerald-300">
                    {currentTourStep.highlightMetric}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {currentTourStep.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {currentTourStep.description}
                </p>
              </div>

              {/* Step Controls & Step Dots */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* 1-9 Step Number Pills */}
                <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                  {GUIDED_TOUR_STEPS.map((st, idx) => (
                    <button
                      key={st.step}
                      type="button"
                      onClick={() => applyTourStep(idx)}
                      className={`w-6 h-6 rounded-lg text-[11px] font-mono font-bold transition-all ${
                        idx === tourStepIndex
                          ? 'bg-cyan-400 text-slate-950 shadow-sm'
                          : idx < (tourStepIndex ?? 0)
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title={`Step ${st.step}: ${st.title}`}
                    >
                      {st.step}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setTourAutoPlay(!tourAutoPlay)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-colors ${
                    tourAutoPlay
                      ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                  }`}
                >
                  {tourAutoPlay ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Auto</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Auto-Guide</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={tourStepIndex === 0}
                  onClick={() => tourStepIndex !== null && applyTourStep(tourStepIndex - 1)}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 text-xs font-semibold flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (tourStepIndex !== null && tourStepIndex < GUIDED_TOUR_STEPS.length - 1) {
                      applyTourStep(tourStepIndex + 1);
                    } else {
                      stopInteractiveDemoTour();
                      triggerToast('Completed the 9-Step HydroSight AI Interactive Tour!');
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-md"
                >
                  <span>
                    {tourStepIndex === GUIDED_TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next Step'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={stopInteractiveDemoTour}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
                  title="Exit Guided Tour"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          MAIN PAGE CONTENT AREA WITH SMOOTH ANIMATED TRANSITIONS
      ===================================================================== */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="space-y-12"
          >
            {/* ===============================================================
                1. HOME TAB
            =============================================================== */}
            {activeTab === 'home' && (
              <div className="space-y-16">
                {/* HERO SECTION */}
                <section className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0B1221] shadow-xl p-6 sm:p-10 lg:p-12">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                    {/* Hero Left Column */}
                    <div className="lg:col-span-6 space-y-6">
                      <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30">
                        <HydroSightLogo size={20} />
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                          AI-POWERED GROUNDWATER INTELLIGENCE
                        </span>
                      </div>

                      <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
                        Predict groundwater depletion{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-sky-500 to-teal-500 dark:from-cyan-400 dark:via-sky-300 dark:to-teal-300">
                          before wells run dry.
                        </span>
                      </h1>

                      <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                        HydroSight AI combines IoT sensors, environmental data, AI forecasting and
                        GIS intelligence to identify groundwater stress before it becomes a critical
                        water crisis.
                      </p>

                      {/* Primary Hero CTA Buttons */}
                      <div className="flex flex-wrap items-center gap-3.5 pt-2">
                        <button
                          type="button"
                          onClick={startInteractiveDemoTour}
                          className="px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>Launch Live Demo (9-Step Tour)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => navigateToTab('map')}
                          className="px-6 py-3.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
                        >
                          <MapIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                          <span>Explore Live Map</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => navigateToTab('dashboard')}
                          className="px-4 py-3.5 text-xs font-mono font-semibold text-cyan-700 dark:text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          <span>Open Command Center</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quick Scenario Switcher Pills */}
                      <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80">
                        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                          Interactive Live Telemetry Preset:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(
                            [
                              'Normal Conditions',
                              'High Extraction',
                              'Low Rainfall',
                              'Extreme Groundwater Stress',
                              'Recovery After Rainfall',
                            ] as SimulationScenario[]
                          ).map((sc) => (
                            <button
                              key={sc}
                              type="button"
                              onClick={() => setScenario(sc)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                scenario === sc
                                  ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-700 dark:text-cyan-300'
                                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              {sc}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Hero Right Column: Interactive 3D Subsurface Cutaway */}
                    <div className="lg:col-span-6">
                      <Underground3DView
                        selectedZone={selectedZone}
                        isHeroCompact={true}
                        scenarioName={scenario}
                      />
                    </div>
                  </div>
                </section>

                {/* LIVE SYSTEM STATUS STRIP */}
                <section className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                        🟢 LIVE DEMO SYSTEM
                      </span>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        DEMO / SIMULATED DATA · Synchronized with {scenario}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      Last Telemetry Sync: {liveNow.toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                      {
                        label: 'Monitoring Points',
                        value: `${systemState.kpis.monitoringPoints}`,
                        sub: '8 Aquifer Zones',
                        color: 'text-cyan-600 dark:text-cyan-400',
                      },
                      {
                        label: 'Active Sensors',
                        value: `${systemState.kpis.activeSensors}`,
                        sub: '5 Offline / Maint.',
                        color: 'text-emerald-600 dark:text-emerald-400',
                      },
                      {
                        label: 'High-Risk Zones',
                        value: `${systemState.kpis.highRiskZones}`,
                        sub: 'Elevated Drawdown',
                        color: 'text-orange-600 dark:text-orange-400',
                      },
                      {
                        label: 'Critical Zones',
                        value: `${systemState.kpis.criticalZones}`,
                        sub: 'Immediate Action',
                        color: 'text-rose-600 dark:text-rose-400',
                      },
                      {
                        label: 'AI Engine Status',
                        value: 'Online',
                        sub: 'Gemini + XGBoost',
                        color: 'text-sky-600 dark:text-sky-400',
                      },
                      {
                        label: 'System Health',
                        value: `${systemState.kpis.systemHealth}%`,
                        sub: 'LoRaWAN + 4G Uplink',
                        color: 'text-teal-600 dark:text-teal-400',
                      },
                    ].map((stat, i) => (
                      <div
                        key={i}
                        className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 shadow-xs hover:border-cyan-500/40 transition-all"
                      >
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {stat.label}
                        </div>
                        <div
                          className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums mt-1.5 ${stat.color}`}
                        >
                          {stat.value}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-1">
                          {stat.sub}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* VISUAL SHOWCASE GALLERY: REAL HYDROGEOLOGICAL FIELD INTELLIGENCE */}
                <section className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                        FIELD-TO-CLOUD OBSERVATORY
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                        Integrated Subsurface, Satellite & IoT Infrastructure
                      </h2>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md">
                      Every monitoring zone fuses solar-powered piezometer stations, satellite
                      watershed GIS, and engineered recharge basins.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      {
                        img: heroAquiferImg,
                        tag: '3D DIGITAL TWIN',
                        title: 'Subsurface Aquifer Modeling',
                        desc: 'Continuous tracking of phreatic water tables, vadose soil moisture, and deep bedrock storage.',
                        targetTab: 'predictions' as NavTabId,
                      },
                      {
                        img: iotBorewellImg,
                        tag: 'EDGE TELEMETRY',
                        title: 'Solar IoT Piezometer Stations',
                        desc: 'ESP32 edge loggers with hydrostatic pressure sensors and LoRaWAN/4G telemetry across 52 borewells.',
                        targetTab: 'monitoring' as NavTabId,
                      },
                      {
                        img: satelliteGisImg,
                        tag: 'SPATIAL GIS',
                        title: 'Watershed & Hotspot Mapping',
                        desc: 'Multi-layer spatial overlays correlating surface topography, extraction cones, and rainfall deficits.',
                        targetTab: 'map' as NavTabId,
                      },
                      {
                        img: rechargeBasinImg,
                        tag: 'PREVENTIVE ACTION',
                        title: 'Managed Aquifer Recharge',
                        desc: 'Data-driven siting of percolation basins, check dams, and rainwater harvesting infrastructure.',
                        targetTab: 'recommendations' as NavTabId,
                      },
                    ].map((card, idx) => (
                      <div
                        key={idx}
                        onClick={() => navigateToTab(card.targetTab)}
                        className="group bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-cyan-500/50 transition-all cursor-pointer flex flex-col"
                      >
                        <div className="h-48 overflow-hidden relative">
                          <img
                            src={card.img}
                            alt={card.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
                          <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-cyan-500/90 text-slate-950 font-mono text-[10px] font-bold">
                            {card.tag}
                          </span>
                        </div>
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                              {card.title}
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                              {card.desc}
                            </p>
                          </div>
                          <div className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-1 pt-1">
                            <span>Explore Module</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* PROBLEM SECTION: TRADITIONAL VS HYDROSIGHT AI */}
                <section className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
                  <div className="max-w-3xl space-y-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      THE PARADIGM SHIFT
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                      Groundwater depletion is a hidden crisis.
                    </h2>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                      Traditional monitoring only tells us what the groundwater condition is today
                      or what happened historically—often after wells have already run dry.
                      HydroSight AI shifts water management from reactive crisis response to
                      predictive early warning.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Traditional Pipeline */}
                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase text-slate-500">
                          Traditional Reactive Monitoring
                        </span>
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400">
                          Late Response
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        {['MONITOR', 'MEASURE', 'REPORT', 'REACT'].map((step, i, arr) => (
                          <React.Fragment key={step}>
                            <div className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                              {step}
                            </div>
                            {i < arr.length - 1 && (
                              <ArrowRight className="w-4 h-4 text-slate-400" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Manual seasonal depth checks fail to capture rapid extraction cones or
                        upcoming 90-day rainfall deficits.
                      </p>
                    </div>

                    {/* HydroSight AI Pipeline */}
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-sky-500/5 to-teal-500/10 border border-cyan-500/40 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase text-cyan-700 dark:text-cyan-300">
                          HydroSight AI Predictive Intelligence
                        </span>
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold">
                          60–90 Day Early Warning
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        {['MONITOR', 'UNDERSTAND', 'PREDICT', 'WARN', 'ACT'].map((step, i, arr) => (
                          <React.Fragment key={step}>
                            <div className="px-3.5 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-mono font-extrabold shadow-xs">
                              {step}
                            </div>
                            {i < arr.length - 1 && (
                              <ArrowRight className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300">
                        Continuous IoT telemetry fused with multi-horizon AI forecasting identifies
                        depletion risk before borewells fail.
                      </p>
                    </div>
                  </div>
                </section>

                {/* HOW IT WORKS: 9-STAGE END-TO-END PIPELINE */}
                <section className="space-y-6">
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                      SYSTEM WORKFLOW
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                      How HydroSight AI Works
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      {
                        step: '01',
                        title: 'IoT Sensors',
                        desc: 'Submersible piezometric level, borewell flow, soil moisture, and tipping-bucket rain sensors.',
                        icon: Radio,
                      },
                      {
                        step: '02',
                        title: 'Data Collection',
                        desc: 'ESP32 edge nodes buffer and transmit encrypted packets via LoRaWAN & 4G LTE-M.',
                        icon: Wifi,
                      },
                      {
                        step: '03',
                        title: 'Cloud Ingestion',
                        desc: 'High-throughput API gateway and time-series spatial storage with zero packet loss.',
                        icon: Cloud,
                      },
                      {
                        step: '04',
                        title: 'Data Processing',
                        desc: 'Barometric compensation, outlier denoising, and rolling drawdown velocity computation.',
                        icon: Cpu,
                      },
                      {
                        step: '05',
                        title: 'AI / ML Forecasting',
                        desc: '30, 60, and 90-day groundwater depth predictions with 95% confidence intervals.',
                        icon: TrendingUp,
                      },
                      {
                        step: '06',
                        title: 'Risk Engine',
                        desc: 'Transparent 0–100 scoring across decline rate, extraction pressure, rainfall, and recharge.',
                        icon: ShieldAlert,
                      },
                      {
                        step: '07',
                        title: 'GIS Intelligence',
                        desc: 'Spatial risk heatmaps, aquifer boundary overlays, and cone-of-depression tracking.',
                        icon: MapIcon,
                      },
                      {
                        step: '08',
                        title: 'Early Warning',
                        desc: 'Automated threshold alerts with live countdowns and Google Chat / Tasks integration.',
                        icon: Bell,
                      },
                      {
                        step: '09',
                        title: 'Recommendations',
                        desc: 'Targeted conservation, pumping schedules, and artificial aquifer recharge directives.',
                        icon: CheckCircle2,
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.step}
                          className="p-5 rounded-2xl bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 transition-all flex items-start gap-4 shadow-xs"
                        >
                          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-600 dark:text-cyan-400">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400">
                              STAGE {item.step}
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                              {item.title}
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* ===============================================================
                2. DASHBOARD TAB
            =============================================================== */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                {/* Top Command Header */}
                <div className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-mono text-[11px] font-bold">
                        🟢 COMMAND CENTER ONLINE
                      </span>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        Scenario: {scenario} · Timeline: {MONTHLY_TIMELINE[monthIndex].month}
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                      Hydrogeological Operations Dashboard
                    </h1>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleGenerateFastBrief}
                      disabled={fastAiLoading}
                      className="px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{fastAiLoading ? 'Synthesizing...' : 'Instant AI Brief'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReportModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Executive Report</span>
                    </button>
                  </div>
                </div>

                {fastAiBrief && (
                  <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <HydroSightLogo size={28} className="shrink-0 mt-0.5" />
                      <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                        <span className="font-mono font-bold text-cyan-700 dark:text-cyan-300 mr-2">
                          [GEMINI FLASH-LITE BRIEF]:
                        </span>
                        {fastAiBrief}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFastAiBrief(null)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* 8 KPI Command Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      title: 'Monitoring Points',
                      value: `${systemState.kpis.monitoringPoints}`,
                      sub: '8 Hydrogeological Zones',
                      color: 'text-cyan-600 dark:text-cyan-400',
                    },
                    {
                      title: 'Active Sensors',
                      value: `${systemState.kpis.activeSensors}`,
                      sub: '90.4% Field Availability',
                      color: 'text-emerald-600 dark:text-emerald-400',
                    },
                    {
                      title: 'Avg Groundwater Depth',
                      value: `${systemState.kpis.avgDepth} m`,
                      sub: 'Below Ground Level (bgl)',
                      color: 'text-sky-600 dark:text-sky-400',
                    },
                    {
                      title: 'High-Risk Zones',
                      value: `${systemState.kpis.highRiskZones}`,
                      sub: 'Risk Score > 50/100',
                      color: 'text-orange-600 dark:text-orange-400',
                    },
                    {
                      title: 'Critical Zones',
                      value: `${systemState.kpis.criticalZones}`,
                      sub: 'Zone D, Zone E, Zone H',
                      color: 'text-rose-600 dark:text-rose-400',
                    },
                    {
                      title: 'Average Risk Score',
                      value: `${systemState.kpis.avgRiskScore}/100`,
                      sub: 'Prototype Risk Engine',
                      color: 'text-amber-600 dark:text-amber-400',
                    },
                    {
                      title: 'Predicted Depletion Zones',
                      value: `${systemState.kpis.predictedDepletionZones}`,
                      sub: '90-Day Drawdown > 1.0 m',
                      color: 'text-purple-600 dark:text-purple-400',
                    },
                    {
                      title: 'System Health',
                      value: `${systemState.kpis.systemHealth}%`,
                      sub: 'Telemetry & AI Pipeline',
                      color: 'text-teal-600 dark:text-teal-400',
                    },
                  ].map((kpi, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs"
                    >
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {kpi.title}
                      </div>
                      <div
                        className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums mt-1.5 ${kpi.color}`}
                      >
                        {kpi.value}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-1">
                        {kpi.sub}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Month-by-Month Interactive Playback Scrubber */}
                <div className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Annual Hydrological Progression Scrubber (Jan – Dec)
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Scrub or auto-play to inspect how seasonal monsoons and dry-season pumping
                        shift water depth and risk.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSimRunning(!simRunning)}
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {simRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{simRunning ? 'Pause Timeline' : 'Play Yearly Cycle'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                    {MONTHLY_TIMELINE.map((m, idx) => (
                      <button
                        key={m.shortMonth}
                        type="button"
                        onClick={() => setMonthIndex(idx)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          monthIndex === idx
                            ? 'bg-cyan-500/15 border-cyan-500 text-cyan-700 dark:text-cyan-300 font-bold'
                            : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                        }`}
                      >
                        <div className="text-[11px] font-mono">{m.shortMonth}</div>
                        <div className="text-[10px] font-mono opacity-80 mt-0.5">
                          {m.groundwaterLevel}m
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dashboard Charts & Zone Table */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: Groundwater Depth & Risk Trajectory Chart */}
                  <div className="lg:col-span-7 bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Groundwater Depth (m) vs. Risk Score Trajectory
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          12-month telemetry correlation across 52 monitoring points
                        </p>
                      </div>
                    </div>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={MONTHLY_TIMELINE}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                          <XAxis dataKey="shortMonth" stroke={chartColors.axis} fontSize={11} />
                          <YAxis
                            yAxisId="left"
                            stroke="#06B6D4"
                            fontSize={11}
                            domain={[30, 44]}
                            unit="m"
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#F43F5E"
                            fontSize={11}
                            domain={[0, 100]}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: chartColors.tooltipBg,
                              borderColor: chartColors.tooltipBorder,
                              color: chartColors.tooltipText,
                              borderRadius: '12px',
                              fontSize: '12px',
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="groundwaterLevel"
                            name="Groundwater Depth (m)"
                            fill="#06B6D4"
                            fillOpacity={0.18}
                            stroke="#06B6D4"
                            strokeWidth={2.5}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="riskScore"
                            name="Risk Score (0-100)"
                            stroke="#F43F5E"
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Right: Zone Risk Matrix */}
                  <div className="lg:col-span-5 bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Regional Aquifer Zone Risk Matrix
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Click any zone to inspect 90-day AI forecast
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {systemState.zones.map((z) => (
                        <div
                          key={z.id}
                          onClick={() => {
                            setSelectedZoneId(z.id);
                            navigateToTab('predictions');
                          }}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            selectedZone.id === z.id
                              ? 'bg-cyan-500/10 border-cyan-500/50'
                              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-cyan-500/30'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                              {z.name}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                              Depth: <strong className="text-cyan-600 dark:text-cyan-400">{z.groundwaterLevel} m</strong> · 90d Forecast: {z.forecast90d} m
                            </div>
                          </div>
                          {renderRiskBadge(z.riskLevel, z.riskScore)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===============================================================
                3. LIVE GROUNDWATER MAP TAB
            =============================================================== */}
            {activeTab === 'map' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                      SPATIAL GIS INTELLIGENCE
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                      Live Groundwater Map & Depletion Hotspots
                    </h1>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      Selected Focus:
                    </span>
                    {renderRiskBadge(selectedZone.riskLevel, selectedZone.riskScore)}
                  </div>
                </div>

                <LiveGroundwaterMap
                  zones={systemState.zones}
                  sensors={sensors}
                  selectedZone={selectedZone}
                  onSelectZone={(z) => setSelectedZoneId(z.id)}
                  onNavigateTab={(tab) => navigateToTab(tab as NavTabId)}
                  themeMode={themeMode}
                />
              </div>
            )}

            {/* ===============================================================
                4. MONITORING TAB (52 IOT SENSORS)
            =============================================================== */}
            {activeTab === 'monitoring' && (
              <div className="space-y-8">
                <div className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                      REAL-TIME EDGE TELEMETRY
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                      52 IoT Piezometer & Borewell Sensor Nodes
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                      47 Active Online Sensors · 5 Offline/Maintenance Nodes (including HYD-014)
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIotStreamActive(!iotStreamActive)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                        iotStreamActive
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Radio className={`w-4 h-4 ${iotStreamActive ? 'animate-pulse text-emerald-500' : ''}`} />
                      <span>{iotStreamActive ? 'Live Telemetry Stream: ON' : 'Enable Live IoT Stream'}</span>
                    </button>
                  </div>
                </div>

                {/* Sensor Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {sensors.slice(0, 24).map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSensorModal(s)}
                      className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 rounded-2xl p-4 shadow-xs transition-all cursor-pointer space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-cyan-700 dark:text-cyan-400">
                            {s.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              s.status === 'OFFLINE'
                                ? 'bg-slate-500/20 text-slate-500'
                                : s.status === 'WARNING'
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {s.status}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{s.lastUpdated}</span>
                      </div>

                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {s.zoneName}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px] font-mono">
                        <div>
                          <span className="text-slate-400 block">Depth</span>
                          <strong className="text-slate-900 dark:text-white">{s.groundwaterLevel} m</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Extraction</span>
                          <strong className="text-slate-900 dark:text-white">{s.extractionRate} L/d</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Recharge Idx</span>
                          <strong className="text-cyan-600 dark:text-cyan-400">{s.rechargeIndex}%</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Battery / Sig</span>
                          <strong className="text-slate-700 dark:text-slate-300">
                            {s.battery}% · {s.signal}%
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===============================================================
                5. AI PREDICTIONS TAB
            =============================================================== */}
            {activeTab === 'predictions' && (
              <div className="space-y-8">
                <div className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                      MULTI-HORIZON FORECASTING ENGINE
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                      30 / 60 / 90-Day AI Groundwater Depth Predictions
                    </h1>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">Select Zone:</span>
                    <select
                      value={selectedZone.id}
                      onChange={(e) => setSelectedZoneId(e.target.value)}
                      className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      {systemState.zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name} (Risk: {z.riskScore}/100)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Selected Zone Forecast Horizon Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      horizon: 'Current Baseline',
                      depth: `${selectedZone.groundwaterLevel} m`,
                      delta: 'Verified Piezometer Level',
                      color: 'text-slate-900 dark:text-white',
                    },
                    {
                      horizon: '30-Day AI Forecast',
                      depth: `${selectedZone.forecast30d} m`,
                      delta: `${(selectedZone.forecast30d - selectedZone.groundwaterLevel).toFixed(1)} m projected change`,
                      color: 'text-cyan-600 dark:text-cyan-400',
                    },
                    {
                      horizon: '60-Day AI Forecast',
                      depth: `${selectedZone.forecast60d} m`,
                      delta: `${(selectedZone.forecast60d - selectedZone.groundwaterLevel).toFixed(1)} m projected change`,
                      color: 'text-amber-600 dark:text-amber-400',
                    },
                    {
                      horizon: '90-Day AI Forecast',
                      depth: `${selectedZone.forecast90d} m`,
                      delta: `${(selectedZone.forecast90d - selectedZone.groundwaterLevel).toFixed(1)} m projected change`,
                      color: 'text-rose-600 dark:text-rose-400',
                    },
                  ].map((card, i) => (
                    <div
                      key={i}
                      className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs"
                    >
                      <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        {card.horizon}
                      </div>
                      <div className={`text-3xl font-extrabold font-mono mt-1.5 ${card.color}`}>
                        {card.depth}
                      </div>
                      <div className="text-xs font-mono text-slate-500 mt-1">{card.delta}</div>
                    </div>
                  ))}
                </div>

                {/* Forecast Chart + AI Reasoning Card */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-8 bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Projected Water Table Trajectory — {selectedZone.name}
                    </h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={[
                            { label: 'Historical', depth: selectedZone.historicalLevel },
                            { label: 'Today', depth: selectedZone.groundwaterLevel },
                            { label: '+30 Days', depth: selectedZone.forecast30d },
                            { label: '+60 Days', depth: selectedZone.forecast60d },
                            { label: '+90 Days', depth: selectedZone.forecast90d },
                          ]}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                          <XAxis dataKey="label" stroke={chartColors.axis} fontSize={12} />
                          <YAxis stroke={chartColors.axis} fontSize={12} unit="m" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: chartColors.tooltipBg,
                              borderColor: chartColors.tooltipBorder,
                              color: chartColors.tooltipText,
                              borderRadius: '12px',
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="depth"
                            name="Predicted Depth (m bgl)"
                            stroke="#06B6D4"
                            fill="#06B6D4"
                            fillOpacity={0.22}
                            strokeWidth={3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="lg:col-span-4 bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                          AI DIAGNOSTIC EXPLANATION
                        </span>
                        {renderRiskBadge(selectedZone.riskLevel, selectedZone.riskScore)}
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {selectedZone.name}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {selectedZone.aiExplanation}
                      </p>
                      <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                        <div className="text-[11px] font-mono font-bold text-cyan-700 dark:text-cyan-300">
                          RECOMMENDED PREVENTIVE DIRECTIVE:
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-200 mt-1">
                          {selectedZone.recommendation}
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-3">
                      Note: Forecasts represent probabilistic AI estimates (95% CI) derived from
                      demonstration telemetry.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===============================================================
                6. ANALYTICS TAB
            =============================================================== */}
            {activeTab === 'analytics' && (
              <div className="space-y-8">
                <div className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                      HYDROGEOLOGICAL CORRELATIONS
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                      Deep Groundwater Analytics & Recharge Deficit
                    </h1>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                    {(['7 Days', '30 Days', '90 Days', '6 Months', '1 Year'] as const).map(
                      (range) => (
                        <button
                          key={range}
                          type="button"
                          onClick={() => setAnalyticsTimeRange(range)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            analyticsTimeRange === range
                              ? 'bg-cyan-500 text-slate-950 font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {range}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Extraction Pressure vs Estimated Recharge Index */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                    <div className="text-xs text-slate-500">Regional Extraction Pressure</div>
                    <div className="text-3xl font-extrabold font-mono text-orange-600 dark:text-orange-400 mt-1">
                      {systemState.kpis.extractionPressure}%
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Agricultural + industrial borewell demand
                    </div>
                  </div>
                  <div className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                    <div className="text-xs text-slate-500">Estimated Recharge Index</div>
                    <div className="text-3xl font-extrabold font-mono text-cyan-600 dark:text-cyan-400 mt-1">
                      {systemState.kpis.estimatedRechargeIndex}%
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Derived from rainfall + soil moisture + level recovery
                    </div>
                  </div>
                  <div className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                    <div className="text-xs text-slate-500">Net Aquifer Recharge Deficit</div>
                    <div className="text-3xl font-extrabold font-mono text-rose-600 dark:text-rose-400 mt-1">
                      {systemState.kpis.rechargeDeficit}%
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Gap requiring artificial recharge intervention
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Monthly Rainfall (mm) vs. Recharge Index (%)
                    </h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={MONTHLY_TIMELINE}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                          <XAxis dataKey="shortMonth" stroke={chartColors.axis} fontSize={11} />
                          <YAxis stroke={chartColors.axis} fontSize={11} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: chartColors.tooltipBg,
                              borderColor: chartColors.tooltipBorder,
                              color: chartColors.tooltipText,
                              borderRadius: '12px',
                            }}
                          />
                          <Legend />
                          <Bar dataKey="rainfall" name="Rainfall (mm)" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="rechargeIndex" name="Est. Recharge Index (%)" fill="#10B981" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Zone-by-Zone Extraction vs. Recharge Comparison
                    </h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={systemState.zones}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                          <XAxis dataKey="id" stroke={chartColors.axis} fontSize={11} />
                          <YAxis stroke={chartColors.axis} fontSize={11} unit="%" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: chartColors.tooltipBg,
                              borderColor: chartColors.tooltipBorder,
                              color: chartColors.tooltipText,
                              borderRadius: '12px',
                            }}
                          />
                          <Legend />
                          <Bar
                            dataKey="extractionPressurePct"
                            name="Extraction Pressure (%)"
                            fill="#F97316"
                            radius={[6, 6, 0, 0]}
                          />
                          <Bar
                            dataKey="estimatedRechargeIndexPct"
                            name="Est. Recharge Index (%)"
                            fill="#06B6D4"
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===============================================================
                7. WEATHER TAB
            =============================================================== */}
            {activeTab === 'weather' && (
              <div className="space-y-8">
                <div className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                    METEOROLOGICAL & RECHARGE INTELLIGENCE
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                    7-Day Weather Forecast & Aquifer Recharge Impact
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Live dates synchronized with system clock ({liveNow.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })})
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
                  {WEATHER_FORECAST_7DAY.map((day, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                          {day.day}
                        </div>
                        <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                          {day.date}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{day.condition}</div>
                      </div>

                      <div className="space-y-1.5 font-mono text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Temp:</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {day.tempMax}° / {day.tempMin}°C
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Rain:</span>
                          <span className="font-bold text-sky-600 dark:text-sky-400">
                            {day.rainMm} mm
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Humidity:</span>
                          <span className="text-slate-700 dark:text-slate-300">{day.humidity}%</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono">
                        <span className="text-slate-400 block">Recharge Impact:</span>
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          {day.rechargeImpact}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===============================================================
                8. ALERTS TAB (ACCURATE TIMESTAMPS & LIVE COUNTDOWNS)
            =============================================================== */}
            {activeTab === 'alerts' && (
              <div className="space-y-8">
                <div className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      EARLY WARNING COMMAND CENTER
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                      Real-Time Groundwater Risk & Alert Timeline
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Synchronized with live system clock ({liveNow.toLocaleString()}) · Countdowns
                      calculated from current depth & monthly drawdown velocity.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {systemState.alerts.map((alert) => {
                    const isAcked = alertAcks.some((a) => a.alertId === alert.id);
                    return (
                      <div
                        key={alert.id}
                        className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2.5">
                            {renderRiskBadge(alert.severity, alert.riskScore)}
                            <span className="text-xs font-mono font-bold text-slate-500">
                              {alert.id} · {alert.zoneName}
                            </span>
                            {alert.sensorId && (
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 font-mono text-[11px] text-cyan-700 dark:text-cyan-400">
                                Sensor: {alert.sensorId}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs font-mono">
                            <span className="text-slate-500 dark:text-slate-400">
                              {alert.timestamp} ({alert.exactDateTime})
                            </span>
                            <span className="px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 font-bold tabular-nums">
                              ⏳ Critical Threshold Countdown:{' '}
                              {formatLiveCountdown(alert.daysToCriticalThreshold)}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {alert.title}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                            {alert.reason}
                          </p>
                          <p className="text-xs font-mono text-amber-700 dark:text-amber-300 mt-1.5">
                            Forecast Impact: {alert.forecastImpact}
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="text-[11px] font-mono font-bold uppercase text-cyan-600 dark:text-cyan-400">
                              Recommended Preventive Action
                            </div>
                            <div className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                              {alert.recommendedAction}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleAcknowledgeAlert(alert)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                                isAcked
                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-slate-900 dark:bg-white text-white dark:text-slate-950'
                              }`}
                            >
                              {isAcked ? '✓ Acknowledged' : 'Acknowledge Alert'}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setWorkspaceConfirmModal({
                                  type: 'create_task',
                                  title: 'Create Preventive Action Task in Google Tasks',
                                  description: `Create task "${alert.title}" in your Google Tasks list?`,
                                  payload: {
                                    title: `[HydroSight ${alert.zoneId}] ${alert.title}`,
                                    notes: `${alert.reason}\nAction: ${alert.recommendedAction}\nLogged: ${alert.exactDateTime}`,
                                  },
                                })
                              }
                              className="px-3 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 text-xs font-bold cursor-pointer"
                            >
                              + Google Task
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ===============================================================
                9. SIMULATION LAB TAB
            =============================================================== */}
            {activeTab === 'simulation' && (
              <div className="space-y-8">
                <div className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                    WHAT-IF HYDROGEOLOGICAL SANDBOX
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                    Interactive Groundwater Stress Simulation Lab
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Select a scenario preset or adjust environmental sliders to model 30/60/90-day
                    aquifer response in real time.
                  </p>
                </div>

                {/* Preset Buttons */}
                <div className="flex flex-wrap gap-2.5">
                  {(
                    [
                      'Normal Conditions',
                      'High Extraction',
                      'Low Rainfall',
                      'Low Recharge',
                      'Extreme Groundwater Stress',
                      'Recovery After Rainfall',
                    ] as SimulationScenario[]
                  ).map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => setScenario(sc)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        scenario === sc
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md'
                          : 'bg-white dark:bg-[#0B1221] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-cyan-500/40'
                      }`}
                    >
                      {sc}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: 6 Interactive Sliders */}
                  <div className="lg:col-span-6 bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-xs">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Hydro-Environmental Input Parameters
                    </h3>

                    {[
                      {
                        label: 'Monthly Rainfall Input',
                        val: `${simRainSlider} mm`,
                        min: 5,
                        max: 120,
                        step: 1,
                        state: simRainSlider,
                        setter: setSimRainSlider,
                      },
                      {
                        label: 'Borewell Extraction Intensity',
                        val: `${simExtSlider}%`,
                        min: 10,
                        max: 100,
                        step: 1,
                        state: simExtSlider,
                        setter: setSimExtSlider,
                      },
                      {
                        label: 'Surface Recharge Efficiency',
                        val: `${simRechSlider}%`,
                        min: 5,
                        max: 80,
                        step: 1,
                        state: simRechSlider,
                        setter: setSimRechSlider,
                      },
                      {
                        label: 'Ambient Surface Temperature',
                        val: `${simTempSlider} °C`,
                        min: 18,
                        max: 45,
                        step: 1,
                        state: simTempSlider,
                        setter: setSimTempSlider,
                      },
                      {
                        label: 'Vadose Zone Soil Moisture',
                        val: `${simSoilSlider}%`,
                        min: 10,
                        max: 85,
                        step: 1,
                        state: simSoilSlider,
                        setter: setSimSoilSlider,
                      },
                      {
                        label: 'Baseline Drawdown Velocity',
                        val: `${simDeclineSlider} m/mo`,
                        min: 0.05,
                        max: 1.5,
                        step: 0.05,
                        state: simDeclineSlider,
                        setter: setSimDeclineSlider,
                      },
                    ].map((sl, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {sl.label}
                          </span>
                          <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                            {sl.val}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={sl.min}
                          max={sl.max}
                          step={sl.step}
                          value={sl.state}
                          onChange={(e) => sl.setter(Number(e.target.value))}
                          className="w-full accent-cyan-500 cursor-pointer"
                        />
                      </div>
                    ))}

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
                      <input
                        type="text"
                        value={simNotesInput}
                        onChange={(e) => setSimNotesInput(e.target.value)}
                        placeholder="Add analyst note for snapshot..."
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleSaveSimulation}
                        className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>Save Snapshot</span>
                      </button>
                    </div>
                  </div>

                  {/* Right: Live Simulated Output */}
                  <div className="lg:col-span-6 bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-xs">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Simulated Aquifer Response
                      </h3>
                      {renderRiskBadge(simLabOutput.riskLevel, simLabOutput.riskScore)}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
                        <div className="text-[11px] text-slate-500">Est. Depth</div>
                        <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
                          {simLabOutput.estDepth} m
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
                        <div className="text-[11px] text-slate-500">30d Forecast</div>
                        <div className="text-xl font-extrabold font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">
                          {simLabOutput.f30} m
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
                        <div className="text-[11px] text-slate-500">60d Forecast</div>
                        <div className="text-xl font-extrabold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                          {simLabOutput.f60} m
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
                        <div className="text-[11px] text-slate-500">90d Forecast</div>
                        <div className="text-xl font-extrabold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                          {simLabOutput.f90} m
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                      <div className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-300">
                        AI SIMULATION DIRECTIVE:
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 mt-1">
                        {simLabOutput.actionText}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===============================================================
                10. AI ASSISTANT TAB (CONNECTED TO GOOGLE SEARCH & GIS)
            =============================================================== */}
            {activeTab === 'assistant' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                    GOOGLE SEARCH & GIS GROUNDED CO-PILOT
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                    HydroSight AI Conversational Assistant & Field Photo Inspector
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Connected with live Google Search Grounding, Google Maps Grounding, High-Thinking
                    mode, and Field Borewell Image Inspection.
                  </p>
                </div>

                <div className="h-[680px]">
                  <AIAssistantWidget
                    zones={systemState.zones}
                    alerts={systemState.alerts}
                    scenario={scenario}
                    selectedZone={selectedZone}
                    isFullPage={true}
                  />
                </div>
              </div>
            )}

            {/* ===============================================================
                11. RECOMMENDATIONS TAB
            =============================================================== */}
            {activeTab === 'recommendations' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
                  <div className="lg:col-span-7 space-y-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                      PREVENTIVE WATER CONSERVATION
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                      AI-Driven Hydrogeological Recommendations
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      Actionable intervention plans dynamically tailored to active scenario{' '}
                      <strong>{scenario}</strong> to replenish aquifers before borewells fail.
                    </p>
                  </div>
                  <div className="lg:col-span-5 h-44 rounded-xl overflow-hidden">
                    <img
                      src={rechargeBasinImg}
                      alt="Groundwater Recharge Basin"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {systemState.recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                            {rec.category}
                          </span>
                          {renderRiskBadge(rec.priority)}
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                          {rec.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          {rec.action}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                        <span className="text-slate-500">Target: {rec.targetZones}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {rec.impactEstimate}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===============================================================
                12. ARCHITECTURE TAB
            =============================================================== */}
            {activeTab === 'architecture' && (
              <div className="space-y-8">
                <div className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                    END-TO-END SYSTEM ENGINEERING
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                    13-Layer IoT, Cloud, GIS & AI System Architecture
                  </h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ARCHITECTURE_NODES.map((node) => (
                      <div
                        key={node.id}
                        onClick={() => setSelectedArchNode(node)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          selectedArchNode.id === node.id
                            ? 'bg-cyan-500/15 border-cyan-500 text-slate-900 dark:text-white shadow-sm'
                            : 'bg-white dark:bg-[#0B1221] border-slate-200 dark:border-slate-800 hover:border-cyan-500/40'
                        }`}
                      >
                        <div className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400">
                          LAYER {node.step}
                        </div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                          {node.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {node.subtitle}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="lg:col-span-5 bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-xs h-fit sticky top-28">
                    <div className="inline-flex px-2.5 py-1 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-mono text-xs font-bold">
                      ACTIVE SPEC · LAYER {selectedArchNode.step}
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                      {selectedArchNode.title}
                    </h3>
                    <p className="text-xs font-mono text-cyan-600 dark:text-cyan-400">
                      {selectedArchNode.subtitle}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {selectedArchNode.description}
                    </p>
                    <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <div className="text-xs font-mono uppercase text-slate-400">
                        Technical Specifications:
                      </div>
                      {selectedArchNode.specs.map((sp, i) => (
                        <div
                          key={i}
                          className="text-xs font-mono text-slate-700 dark:text-slate-200 flex items-center gap-2"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{sp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===============================================================
                13. ABOUT HYDROSIGHT TAB
            =============================================================== */}
            {activeTab === 'about' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xs">
                  <div className="lg:col-span-7 space-y-4">
                    <div className="flex items-center gap-3">
                      <HydroSightLogo size={42} />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                        ABOUT HYDROSIGHT AI
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                      Protecting Subsurface Water Security with Predictive AI
                    </h1>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                      HydroSight AI was engineered to solve one of the planet’s most urgent silent
                      crises: aquifer depletion. By uniting submersible IoT piezometers, satellite
                      GIS intelligence, and multi-horizon machine learning, we empower communities,
                      agricultural cooperatives, and water authorities to act months before wells run
                      dry.
                    </p>
                  </div>
                  <div className="lg:col-span-5 rounded-2xl overflow-hidden h-64">
                    <img
                      src={iotBorewellImg}
                      alt="HydroSight IoT Station"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ===============================================================
                14. DATA & METHODOLOGY TAB
            =============================================================== */}
            {activeTab === 'methodology' && (
              <div className="space-y-8">
                <div className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                    SCIENTIFIC TRANSPARENCY & RISK ENGINE MATH
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                    Data Sources, Prototype Risk Formula & Methodology
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Transparent documentation of how HydroSight AI computes risk scores, recharge
                    indices, and 90-day forecasts.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {[
                    { factor: 'Water-Level Decline', weight: '25%', desc: 'Current depth vs. historical baseline drawdown' },
                    { factor: 'Extraction Pressure', weight: '25%', desc: 'Daily pumping rate vs. safe yield threshold' },
                    { factor: 'Rainfall Deficit', weight: '20%', desc: 'Deviation from seasonal precipitation normal' },
                    { factor: 'Recharge Stress', weight: '15%', desc: 'Infiltration & soil moisture recovery deficit' },
                    { factor: 'Historical Trend', weight: '15%', desc: 'Multi-month drawdown acceleration slope' },
                  ].map((f, i) => (
                    <div
                      key={i}
                      className="bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-2"
                    >
                      <div className="text-2xl font-extrabold font-mono text-cyan-600 dark:text-cyan-400">
                        {f.weight}
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {f.factor}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* =====================================================================
          COMMAND PALETTE SEARCH MODAL (⌘K) — PROPERLY POSITIONED
      ===================================================================== */}
      <AnimatePresence>
        {searchModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
            onClick={() => setSearchModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <Search className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <input
                  type="text"
                  autoFocus
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Search monitoring zones (Zone D), sensors (HYD-022), or platform modules..."
                  className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setSearchModalOpen(false)}
                  className="text-xs font-mono text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  ESC
                </button>
              </div>

              <div className="p-4 max-h-96 overflow-y-auto space-y-4">
                <div>
                  <div className="text-[10px] font-mono uppercase text-slate-400 mb-2">
                    Aquifer Monitoring Zones
                  </div>
                  <div className="space-y-1.5">
                    {searchResults.zones.map((z) => (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => {
                          setSelectedZoneId(z.id);
                          setSearchModalOpen(false);
                          navigateToTab('map');
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-left transition-colors"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {z.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            Depth: {z.groundwaterLevel} m · 90d Forecast: {z.forecast90d} m
                          </div>
                        </div>
                        {renderRiskBadge(z.riskLevel, z.riskScore)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-mono uppercase text-slate-400 mb-2">
                    Platform Modules
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {searchResults.tabs.map((t) => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSearchModalOpen(false);
                            navigateToTab(t.id);
                          }}
                          className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-left text-xs font-semibold text-slate-700 dark:text-slate-200"
                        >
                          <Icon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sensor Detail Modal */}
      {selectedSensorModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedSensorModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HydroSightLogo size={26} />
                <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white">
                  Sensor {selectedSensorModal.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSensorModal(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-500">{selectedSensorModal.zoneName}</div>
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400 block">Groundwater Depth</span>
                <strong className="text-base text-cyan-600 dark:text-cyan-400">
                  {selectedSensorModal.groundwaterLevel} m
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400 block">90-Day Forecast</span>
                <strong className="text-base text-rose-600 dark:text-rose-400">
                  {selectedSensorModal.forecast90d} m
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400 block">Extraction Rate</span>
                <strong className="text-slate-900 dark:text-white">
                  {selectedSensorModal.extractionRate} L/day
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400 block">Recharge Index</span>
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {selectedSensorModal.rechargeIndex}%
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Executive Report Modal */}
      {reportModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setReportModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <HydroSightLogo size={34} />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    HydroSight AI — Executive Hydrogeological Report
                  </h3>
                  <p className="text-xs font-mono text-slate-500">
                    Generated: {liveNow.toLocaleString()} · Scenario: {scenario}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400 block">Avg Depth</span>
                <strong className="text-base text-slate-900 dark:text-white">
                  {systemState.kpis.avgDepth} m
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400 block">Avg Risk Score</span>
                <strong className="text-base text-rose-600 dark:text-rose-400">
                  {systemState.kpis.avgRiskScore}/100
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400 block">Recharge Deficit</span>
                <strong className="text-base text-amber-600 dark:text-amber-400">
                  {systemState.kpis.rechargeDeficit}%
                </strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workspace Confirmation Dialog */}
      {workspaceConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {workspaceConfirmModal.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {workspaceConfirmModal.description}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWorkspaceConfirmModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={workspaceLoading}
                onClick={executeConfirmedAction}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold"
              >
                {workspaceLoading ? 'Processing...' : 'Confirm & Execute'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Assistant Widget (Always accessible across all tabs except full-page assistant tab) */}
      {activeTab !== 'assistant' && (
        <AIAssistantWidget
          zones={systemState.zones}
          alerts={systemState.alerts}
          scenario={scenario}
          selectedZone={selectedZone}
          isFullPage={false}
          externalOpen={assistantPopupOpen}
          onToggleExternalOpen={setAssistantPopupOpen}
        />
      )}

      {/* =====================================================================
          UNIFIED FOOTER
      ===================================================================== */}
      <footer className="bg-white dark:bg-[#070B14] border-t border-slate-200 dark:border-slate-800/80 py-8 mt-16">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <HydroSightLogo size={30} />
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                HydroSight AI
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                “Predict groundwater depletion before wells run dry.”
              </span>
            </div>
          </div>
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
            🟢 52 Monitoring Points · 47 Active Sensors · Google Search & GIS Grounded
          </div>
        </div>
      </footer>
    </div>
  );
}

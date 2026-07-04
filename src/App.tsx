import { useState, useEffect, useRef } from 'react';
import { 
  Globe, 
  ShieldAlert, 
  Plus, 
  Search, 
  LogOut, 
  Anchor, 
  User as UserIcon, 
  FileCheck, 
  Layers, 
  Cpu, 
  Trash2, 
  Play, 
  Edit3, 
  Clock, 
  AlertCircle,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Container, User } from './types';

// Components
import Login from './components/Login';
import DashboardStats from './components/DashboardStats';
import ContainerMap from './components/ContainerMap';
import ContainerBayVisualizer from './components/ContainerBayVisualizer';
import AICustomsReport from './components/AICustomsReport';
import ContainerDetailsModal from './components/ContainerDetailsModal';

export default function App() {
  // Authentication & session states
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState('');

  const canManage = user?.role === 'logistics_manager';

  // Container list & selected container
  const [containers, setContainers] = useState<Container[]>([]);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');

  // Interactive Tab inside Selected Container
  const [activeDetailsTab, setActiveDetailsTab] = useState<'map' | 'stowage' | 'ai'>('map');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [containerToEdit, setContainerToEdit] = useState<Container | null>(null);
  const [containerIdToDelete, setContainerIdToDelete] = useState<string | null>(null);

  // Inactivity / Idle Logout states (15 minutes = 900 seconds)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // On mount, check if there is an active session in localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('cms_user');
    const savedToken = localStorage.getItem('cms_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
      fetchContainers(savedToken);
    }
  }, []);

  const fetchContainers = async (overrideToken?: string) => {
    const activeToken = overrideToken || token;
    if (!activeToken) return;

    try {
      const res = await fetch('/api/containers', {
        headers: {
          'Authorization': `Bearer ${activeToken}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        let finalData = data;
        const localDataStr = localStorage.getItem('cms_containers');
        if (localDataStr) {
          try {
            const localData = JSON.parse(localDataStr) as Container[];
            const serverIds = new Set(data.map((c: any) => c.id));
            const hasLocalAdditions = localData.some(lc => !serverIds.has(lc.id));
            
            // If the server data has been reset (e.g., container restarted and has default 3 elements or less)
            // but the client has more stored elements, restore them by syncing them to the server!
            if (hasLocalAdditions && data.length <= 3) {
              console.log('Deploy/Restart sync: Hydrating server with client containers...');
              const syncRes = await fetch('/api/containers/sync', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${activeToken}`
                },
                body: JSON.stringify({ containers: localData })
              });
              if (syncRes.ok) {
                finalData = localData;
              }
            }
          } catch (parseErr) {
            console.error('Error parsing local container backups:', parseErr);
          }
        }

        setContainers(finalData);
        localStorage.setItem('cms_containers', JSON.stringify(finalData));

        if (finalData.length > 0 && !selectedContainerId) {
          setSelectedContainerId(finalData[0].id);
        }
      } else if (res.status === 401) {
        handleLogout('Session expired or invalid. Please log in again.');
      }
    } catch (err) {
      console.error('Error fetching container datasets, fallback to local storage:', err);
      const localDataStr = localStorage.getItem('cms_containers');
      if (localDataStr) {
        try {
          const localData = JSON.parse(localDataStr);
          setContainers(localData);
          if (localData.length > 0 && !selectedContainerId) {
            setSelectedContainerId(localData[0].id);
          }
        } catch (parseErr) {
          console.error('Local storage fallback parse error:', parseErr);
        }
      }
    }
  };

  // Inactivity Tracker Engine
  useEffect(() => {
    if (!user) {
      // Clear timers if logged out
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    // Reset countdown to 900 seconds (15 minutes)
    setSecondsRemaining(900);
    setShowIdleWarning(false);
    lastActivityRef.current = Date.now();

    // Reset activity timer handler
    const recordUserActivity = () => {
      lastActivityRef.current = Date.now();
      setSecondsRemaining(900);
      setShowIdleWarning(false);
    };

    // Listen to standard interaction events
    window.addEventListener('mousemove', recordUserActivity);
    window.addEventListener('keydown', recordUserActivity);
    window.addEventListener('click', recordUserActivity);
    window.addEventListener('scroll', recordUserActivity);

    // Dynamic ticker checking state every second
    timerIntervalRef.current = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = Math.max(900 - elapsedSeconds, 0);
      
      setSecondsRemaining(remaining);

      // Warning when 60 seconds are remaining
      if (remaining <= 60 && remaining > 0) {
        setShowIdleWarning(true);
      }

      if (remaining === 0) {
        // Trigger Logout immediately!
        handleLogout('Session cleared due to 15 minutes of inactivity.');
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      window.removeEventListener('mousemove', recordUserActivity);
      window.removeEventListener('keydown', recordUserActivity);
      window.removeEventListener('click', recordUserActivity);
      window.removeEventListener('scroll', recordUserActivity);
    };
  }, [user]);

  const handleLoginSuccess = (loggedInUser: User, sessionToken: string) => {
    setUser(loggedInUser);
    setToken(sessionToken);
    setSessionExpiredMessage('');
    localStorage.setItem('cms_user', JSON.stringify(loggedInUser));
    localStorage.setItem('cms_token', sessionToken);
    fetchContainers(sessionToken);
  };

  const handleLogout = (message = '') => {
    setUser(null);
    setToken(null);
    setSelectedContainerId(null);
    localStorage.removeItem('cms_user');
    localStorage.removeItem('cms_token');
    
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    if (message) {
      setSessionExpiredMessage(message);
    }
  };

  const extendSession = () => {
    lastActivityRef.current = Date.now();
    setSecondsRemaining(900);
    setShowIdleWarning(false);
  };

  // CRUD Operations
  const handleCreateOrUpdate = async (payload: Partial<Container>) => {
    const activeToken = token || localStorage.getItem('cms_token');
    if (!activeToken) return;

    try {
      const isEdit = !!payload.id;
      const url = isEdit ? `/api/containers/${payload.id}` : '/api/containers';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(payload),
      });

      const savedContainer = await res.json();
      if (!res.ok) {
        console.error(savedContainer.error || 'Logistics save failed');
        return;
      }

      // Optimistically update localStorage and component state, then fetch
      let updatedList = [...containers];
      if (isEdit) {
        updatedList = updatedList.map(c => c.id === savedContainer.id ? savedContainer : c);
      } else {
        updatedList.push(savedContainer);
      }
      setContainers(updatedList);
      localStorage.setItem('cms_containers', JSON.stringify(updatedList));

      await fetchContainers(activeToken);
      setSelectedContainerId(savedContainer.id);
      setIsModalOpen(false);
      setContainerToEdit(null);
    } catch (err) {
      console.error('Save Failure:', err);
    }
  };

  const handleDelete = async (id: string) => {
    const activeToken = token || localStorage.getItem('cms_token');
    if (!activeToken) return;

    try {
      const res = await fetch(`/api/containers/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${activeToken}`
        }
      });
      if (res.ok) {
        const remaining = containers.filter(c => c.id !== id);
        setContainers(remaining);
        localStorage.setItem('cms_containers', JSON.stringify(remaining));
        if (remaining.length > 0) {
          setSelectedContainerId(remaining[0].id);
        } else {
          setSelectedContainerId(null);
        }
      } else {
        const errData = await res.json();
        console.error(errData.error || 'Delete failed due to security restrictions.');
      }
    } catch (err) {
      console.error('Delete Failure:', err);
    }
  };

  const exportToExcel = () => {
    if (!filteredContainers || filteredContainers.length === 0) return;
    
    // Headers for Excel
    const headers = [
      'Container Number',
      'BL Number',
      'Status',
      'Party Name',
      'Item Details',
      'ETA',
      'Deal Amount (USD)',
      'Advance Payment (USD)',
      'Balance Due (USD)',
      'Deal Date',
      'Container Size',
      'Vessel Name',
      'Voyage Number',
      'Cargo Weight (kg)',
      'Port of Loading',
      'Port of Discharge'
    ];
    
    // Rows
    const rows = filteredContainers.map(c => [
      c.containerNumber,
      c.blNumber,
      c.status,
      c.partyName.replace(/"/g, '""'), // escape quotes
      c.itemDetails.replace(/"/g, '""'),
      c.eta,
      c.dealAmount,
      c.advancePayment,
      c.dealAmount - c.advancePayment,
      c.dealDate,
      c.containerSize,
      c.vesselName,
      c.voyageNumber,
      c.cargoWeight,
      c.portOfLoading,
      c.portOfDischarge
    ]);
    
    // Build CSV content with standard Excel CSV encoding support
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `container_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // shipment simulation tool - lets brokers add mock tracking events!
  const triggerSimulationLog = async (overrideId?: string) => {
    const targetId = overrideId || selectedContainerId;
    if (!targetId) return;
    const current = containers.find(c => c.id === targetId);
    if (!current) return;

    // Prompt custom simulated tracking updates
    const events = [
      { status: 'In Transit (Ocean)', event: 'Ocean Route GPS Ping', desc: 'Sailing coordinates stowed 28°52\'N 142°35\'W. Current speed 19.8 knots. Calm seas, swell 1.2m.' },
      { status: 'At Port of Discharge', event: 'Customs Manifest Lodged', desc: 'Ocean manifest sent to CBP customs automated portal. Customs broker filed Entry Summary form 7501.' },
      { status: 'Customs Hold', event: 'Agricultural Fumigation Check', desc: 'Agricultural customs inspector placed temporary hold for compliance inspection.' },
      { status: 'Customs Clearance', event: 'Customs Bond Released', desc: 'Duty paid. Carrier customs release granted. Delivery orders dispatched to truck dispatcher.' },
      { status: 'Out for Delivery', event: 'Gated Out at Port Gate', desc: 'Container loaded on triple-axle chassis. Gated out of terminal stack. Intermodal drayage active.' }
    ];

    // Pick a random event to inject into logs
    const randomEvent = events[Math.floor(Math.random() * events.length)];
    
    const newLog = {
      id: "log_sim_" + Date.now(),
      timestamp: new Date().toISOString(),
      event: randomEvent.event,
      location: current.portOfDischarge || 'Destination Port Terminal',
      status: randomEvent.status as any,
      description: randomEvent.desc
    };

    const updatedLogs = [...(current.trackingLogs || []), newLog];
    
    // Automatically advance the core status if appropriate
    await handleCreateOrUpdate({
      ...current,
      status: randomEvent.status as any,
      trackingLogs: updatedLogs
    });
  };

  // Filter & Search Logic
  const filteredContainers = containers.filter(c => {
    const matchesSearch = 
      c.containerNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.blNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.partyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.itemDetails.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'active') return matchesSearch && c.status !== 'Delivered';
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'holds') return matchesSearch && c.status === 'Customs Hold';
    if (statusFilter === 'transit') return matchesSearch && (c.status === 'In Transit (Ocean)' || c.status === 'Out for Delivery');
    if (statusFilter === 'completed') return matchesSearch && c.status === 'Delivered';
    return matchesSearch;
  });

  const selectedContainer = containers.find(c => c.id === selectedContainerId) || null;

  // Format countdown clock (MM:SS)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Login view guard
  if (!user) {
    return (
      <div id="auth-guard">
        {sessionExpiredMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-xs px-4 py-3 rounded-lg shadow-xl border border-amber-500 z-50 flex items-center gap-2 max-w-sm animate-bounce" id="session-alert">
            <Clock className="w-4 h-4" />
            <span>{sessionExpiredMessage}</span>
          </div>
        )}
        <Login onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative" id="cms-dashboard-root">
      
      {/* Dynamic 15-Minute Inactivity Warning Screen Modal Overlay */}
      <AnimatePresence>
        {showIdleWarning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4"
            id="idle-warning-modal"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center space-y-4"
            >
              <div className="w-14 h-14 bg-amber-500/15 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-500 animate-bounce">
                <Clock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-sans">Session Expiring Soon</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                We detected that you have been idle. For secure importer data integrity, you will be logged out automatically in <span className="font-mono font-bold text-red-500 text-sm">{formatTime(secondsRemaining)}</span>.
              </p>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => handleLogout('Session terminated manually.')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs cursor-pointer"
                >
                  Logout Operator
                </button>
                <button
                  onClick={extendSession}
                  id="extend-session-btn"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs cursor-pointer shadow-md shadow-blue-600/20"
                >
                  Keep Working
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Premium Navbar */}
      <header className="bg-white border-b border-slate-200 text-slate-800 px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm shrink-0 z-30 min-h-20" id="portal-navbar">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
            <Globe className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold font-sans text-slate-900 tracking-tight">CargoLedger Pro</span>
              <span className="text-[10px] font-mono bg-blue-500/10 border border-blue-400/20 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase">
                Importer expert v2.5
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Maritime Container Operations Console</p>
          </div>
        </div>

        {/* Dynamic operator profile */}
        <div className="flex items-center flex-wrap gap-4 text-xs font-mono" id="operator-badge">

          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2.5">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-[10px] uppercase">
              {user.username.substring(0, 2)}
            </div>
            <div>
              <p className="text-slate-800 font-bold leading-none">{user.username}</p>
              <p className="text-[9px] text-slate-500 uppercase mt-0.5">
                {user.role === 'importer_expert' ? 'Customs Lead' : 'Logistics Manager'}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleLogout('Logout successful.')}
            id="navbar-logout-btn"
            className="p-2.5 bg-slate-50 border border-slate-200 hover:border-red-500/50 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition-all cursor-pointer"
            title="Terminate Active Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Primary Workspace Scroll Area */}
      <main className="flex-grow p-4 md:p-6 space-y-6 overflow-y-auto max-w-[1600px] mx-auto w-full" id="workspace-container">
        
        {/* Statistics Dashboard widgets row */}
        <DashboardStats containers={containers} isAdmin={canManage} />

        {/* Main interactive split column */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="split-workspace">
          
          {/* FULL PANEL: CONTAINER LIST DATABASE LEDGER */}
          <section className="lg:col-span-12 bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col shadow-sm max-h-[48rem]" id="ledger-pane">
            
            {/* Ledger Toolbar Header */}
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 font-sans text-sm uppercase tracking-wider">
                  Container Registry Ledger
                </h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Showing {filteredContainers.length} of {containers.length} maritime logs</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportToExcel}
                  id="export-excel-btn"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-xs cursor-pointer flex items-center gap-1.5 transition-colors shadow shadow-emerald-600/10 font-sans"
                  title="Export current ledger to Excel CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export to Excel</span>
                </button>

                {canManage && (
                  <button
                    onClick={() => {
                      setContainerToEdit(null);
                      setIsModalOpen(true);
                    }}
                    id="add-container-btn"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs cursor-pointer flex items-center gap-1.5 transition-colors shadow shadow-blue-600/10 font-sans"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Container</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter Search controls */}
            <div className="space-y-3 mb-4" id="filters-toolbar">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  id="ledger-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search container, BL, items or party..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                />
              </div>

              {/* Status Pills Select */}
              <div className="flex flex-wrap gap-1.5 font-mono text-[10px]" id="status-filter-pills">
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-full border cursor-pointer font-bold transition-all ${
                    statusFilter === 'active' 
                      ? 'bg-blue-600 border-blue-700 text-white shadow-sm shadow-blue-500/10' 
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  ACTIVE CONTAINERS
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3 py-1.5 rounded-full border cursor-pointer font-bold transition-all ${
                    statusFilter === 'completed' 
                      ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm shadow-emerald-500/10' 
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  DELIVERED
                </button>
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-full border cursor-pointer font-bold transition-all ${
                    statusFilter === 'all' 
                      ? 'bg-slate-800 border-slate-900 text-white shadow-sm' 
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  ALL SHIPMENTS
                </button>
                <button
                  onClick={() => setStatusFilter('holds')}
                  className={`px-3 py-1.5 rounded-full border cursor-pointer font-bold transition-all ${
                    statusFilter === 'holds' 
                      ? 'bg-red-500 border-red-600 text-white shadow-sm shadow-red-500/10' 
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  CUSTOMS HOLDS
                </button>
              </div>
            </div>

            {/* Container Cards Scroll Stack */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-1 flex-grow" id="ledger-cards-container">
              {filteredContainers.length > 0 ? (
                filteredContainers.map((c) => {
                  const balanceDue = c.dealAmount - c.advancePayment;

                  return (
                    <div
                      key={c.id}
                      id={`container-card-${c.id}`}
                      className="p-4 border rounded-xl text-left transition-all duration-200 bg-white hover:bg-slate-50/70 border-slate-200 flex flex-col justify-between min-h-[12rem] shadow-sm relative"
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-mono font-bold text-sm text-slate-900 tracking-wider">
                              {c.containerNumber}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                              BL {c.blNumber} • {c.containerSize || '40ft'}
                            </p>
                          </div>
                          
                          {/* Status tag */}
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                            c.status === 'Customs Hold'
                              ? 'bg-red-50 text-red-600 border-red-200'
                              : c.status === 'Delivered'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : 'bg-blue-50 text-blue-600 border-blue-200'
                          }`}>
                            {c.status.replace(' (Ocean)', '')}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 mt-2 truncate font-sans font-medium">
                          {c.partyName}
                        </p>

                        <p className="text-[11px] text-slate-400 truncate mt-1 leading-snug">
                          {c.itemDetails}
                        </p>
                      </div>

                      <div className="mt-4 pt-2.5 border-t border-slate-100 flex justify-between items-center text-[10px] font-mono">
                        <div className="flex flex-col">
                          <span className="text-slate-400 text-[9px] uppercase">ETA</span>
                          <span className="text-slate-700 font-bold">{c.eta}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          {balanceDue > 0 ? (
                            <span className="text-slate-500 font-bold bg-amber-500/10 text-amber-700 px-1.5 py-0.5 rounded border border-amber-500/15">
                              Bal: ${balanceDue.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/15 flex items-center gap-0.5">
                              <FileCheck className="w-3 h-3" /> paid
                            </span>
                          )}

                          {canManage && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setContainerToEdit(c);
                                  setIsModalOpen(true);
                                }}
                                className="p-1 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setContainerIdToDelete(c.id);
                                }}
                                className="p-1 hover:bg-red-50 border border-transparent hover:border-red-200 rounded text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-16 text-slate-400 col-span-full" id="empty-ledger-state">
                  <Search className="w-8 h-8 mx-auto text-slate-300 mb-2 animate-bounce" />
                  <p className="font-mono text-xs">No maritime records match query.</p>
                </div>
              )}
            </div>
          </section>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200/80 px-6 py-4 text-center text-xs text-slate-400 mt-auto flex flex-col sm:flex-row justify-between items-center gap-2 shrink-0 z-20" id="portal-footer">
        <p>© 2026 CargoLedger Maritime Inc. All rights reserved. Operator Portal.</p>
        <p className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
          <span>Automated security: Idle session terminates after 15m of operator silence.</span>
        </p>
      </footer>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {containerIdToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4 mx-auto">
                  <ShieldAlert className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 text-center mb-2">Delete Container</h3>
                <p className="text-sm text-slate-500 text-center">
                  Are you sure you want to delete this container? This action will erase stowed shipping events and cannot be undone.
                </p>
              </div>
              <div className="bg-slate-50 px-6 py-4 flex gap-3 justify-end border-t border-slate-100">
                <button
                  onClick={() => setContainerIdToDelete(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleDelete(containerIdToDelete);
                    setContainerIdToDelete(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Container creation/modification drawer */}
      <ContainerDetailsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setContainerToEdit(null);
        }}
        onSave={handleCreateOrUpdate}
        containerToEdit={containerToEdit}
      />

    </div>
  );
}

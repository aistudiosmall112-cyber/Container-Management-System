import { Anchor, Compass, Navigation, Radio, Wind } from 'lucide-react';
import { Container } from '../types';

interface ContainerMapProps {
  container: Container;
}

export default function ContainerMap({ container }: ContainerMapProps) {
  // Define coordinate mapping for cargo paths
  const portCoords: Record<string, { x: number; y: number; lat: string; lon: string }> = {
    'Tianjin Port, China': { x: 190, y: 150, lat: "38°58'N", lon: "117°46'E" },
    'Port of Houston, USA': { x: 580, y: 168, lat: "29°45'N", lon: "95°05'W" },
    'Nhava Sheva Port, India': { x: 230, y: 180, lat: "18°56'N", lon: "72°57'E" },
    'Port of Los Angeles, USA': { x: 530, y: 155, lat: "33°43'N", lon: "118°15'W" },
    'Port of Rotterdam, Netherlands': { x: 380, y: 110, lat: "51°55'N", lon: "4°24'E" },
    'Port of New York, USA': { x: 570, y: 145, lat: "40°40'N", lon: "74°01'W" },
  };

  const originName = container.portOfLoading || 'Origin Port';
  const dischargeName = container.portOfDischarge || 'Destination Port';

  const origin = portCoords[originName] || { x: 150, y: 160, lat: "0°00'N", lon: "0°00'E" };
  const discharge = portCoords[dischargeName] || { x: 550, y: 150, lat: "0°00'S", lon: "0°00'W" };

  // Determine ship position based on status
  let percentage = 0;
  let statusText = 'Awaiting departure';
  let isMoving = false;

  switch (container.status) {
    case 'Booked':
      percentage = 0;
      statusText = 'Pre-transit / Port of Loading';
      break;
    case 'Empty Pickup':
      percentage = 5;
      statusText = 'Container release at yard';
      break;
    case 'Loaded at Port':
      percentage = 15;
      statusText = 'Customs cleared, stowed on vessel';
      break;
    case 'In Transit (Ocean)':
      percentage = 60;
      statusText = 'Ocean transit active';
      isMoving = true;
      break;
    case 'At Port of Discharge':
    case 'Customs Hold':
    case 'Customs Clearance':
      percentage = 90;
      statusText = 'Vessel berthed, cargo discharged';
      break;
    case 'Out for Delivery':
      percentage = 95;
      statusText = 'Intermodal land drayage active';
      isMoving = true;
      break;
    case 'Delivered':
      percentage = 100;
      statusText = 'Completed / Final Gate In';
      break;
  }

  // Linear interpolation for ship marker
  const shipX = origin.x + (discharge.x - origin.x) * (percentage / 100);
  // Add a slight curve (arc) to the visual line
  const controlY = Math.min(origin.y, discharge.y) - 30;
  
  // Calculate quadratic bezier curve point for the ship
  const t = percentage / 100;
  const shipCurveX = (1 - t) * (1 - t) * origin.x + 2 * (1 - t) * t * ((origin.x + discharge.x) / 2) + t * t * discharge.x;
  const shipCurveY = (1 - t) * (1 - t) * origin.y + 2 * (1 - t) * t * controlY + t * t * discharge.y;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 text-slate-800 flex flex-col h-full" id={`vessel-map-${container.id}`}>
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-blue-600 animate-pulse" />
          <h3 className="font-bold text-sm uppercase tracking-wider font-sans text-slate-900">
            Vessel Tracking & AIS Telemetry
          </h3>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-full text-xs font-mono text-emerald-700">
          <span className={`w-2 h-2 rounded-full bg-emerald-500 ${isMoving ? 'animate-ping' : ''}`}></span>
          <span>{statusText}</span>
        </div>
      </div>

      {/* Stylized Ocean Tracking Grid Map */}
      <div className="relative bg-slate-950 border border-slate-900 rounded-lg overflow-hidden h-48 md:h-64 flex-shrink-0 mb-4 shadow-inner" id="ocean-map-grid">
        {/* World Coordinates Grid Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
          <defs>
            <pattern id="map-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#38bdf8" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#map-grid)" />
        </svg>

        {/* Dynamic Route SVG Layer */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="none">
          {/* Origin Radar Sweep */}
          {percentage < 100 && (
            <circle cx={origin.x} cy={origin.y} r="15" className="fill-blue-500/10 stroke-blue-500/30 stroke-1 animate-ping" />
          )}
          {/* Destination Radar Sweep */}
          {percentage > 0 && percentage < 100 && (
            <circle cx={discharge.x} cy={discharge.y} r="15" className="fill-emerald-500/10 stroke-emerald-500/30 stroke-1 animate-ping" />
          )}

          {/* Transit sea lane curve */}
          <path
            d={`M ${origin.x} ${origin.y} Q ${(origin.x + discharge.x) / 2} ${controlY} ${discharge.x} ${discharge.y}`}
            fill="none"
            stroke="#1e293b"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d={`M ${origin.x} ${origin.y} Q ${(origin.x + discharge.x) / 2} ${controlY} ${discharge.x} ${discharge.y}`}
            fill="none"
            stroke={container.status === 'Customs Hold' ? '#ef4444' : '#3b82f6'}
            strokeWidth="2"
            strokeDasharray="5,4"
            className="opacity-70"
            strokeLinecap="round"
          />

          {/* Port Nodes */}
          {/* Origin */}
          <g transform={`translate(${origin.x}, ${origin.y})`}>
            <circle r="6" className="fill-slate-950 stroke-blue-500 stroke-2" />
            <circle r="2.5" className="fill-blue-400" />
          </g>
          {/* Destination */}
          <g transform={`translate(${discharge.x}, ${discharge.y})`}>
            <circle r="6" className="fill-slate-950 stroke-emerald-500 stroke-2" />
            <circle r="2.5" className="fill-emerald-400" />
          </g>

          {/* Glowing ship marker */}
          {percentage > 0 && percentage < 100 && (
            <g transform={`translate(${shipCurveX}, ${shipCurveY})`}>
              <circle r="12" className="fill-blue-500/20 stroke-blue-500/40 animate-pulse stroke-1" />
              <path
                d="M-5,-3 L5,-3 L7,4 L-7,4 Z"
                className="fill-blue-500 stroke-blue-400 stroke-1"
              />
              <path d="M-1,-3 L2,-8 L2,-3 Z" className="fill-white" />
            </g>
          )}
        </svg>

        {/* Quick Labels inside Map */}
        <div className="absolute top-2 left-3 bg-slate-900/90 backdrop-blur-sm border border-slate-800 p-2 rounded text-[10px] font-mono" id="map-telemetry-panel">
          <p className="text-slate-400 uppercase font-bold text-[9px] tracking-wider mb-1">Carrier AIS</p>
          <p><span className="text-slate-500">Vessel:</span> <span className="text-white font-medium">{container.vesselName || 'N/A'}</span></p>
          <p><span className="text-slate-500">Voyage:</span> <span className="text-white font-medium">{container.voyageNumber || 'N/A'}</span></p>
        </div>

        {/* Coordinate Labels */}
        <div className="absolute bottom-2 left-3 text-[10px] font-mono text-blue-400 bg-slate-900/60 px-1.5 py-0.5 rounded">
          POL {origin.lat} | {origin.lon}
        </div>
        <div className="absolute bottom-2 right-3 text-[10px] font-mono text-emerald-400 bg-slate-900/60 px-1.5 py-0.5 rounded">
          POD {discharge.lat} | {discharge.lon}
        </div>
      </div>

      {/* AIS Parameters Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono" id="ais-telemetry-metrics">
        <div className="bg-slate-50 border border-slate-200/60 p-2.5 rounded-lg">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <Anchor className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[10px] uppercase font-bold">Loading Port</span>
          </div>
          <p className="text-slate-800 truncate font-semibold" title={originName}>
            {originName.replace(' Port', '').replace(', China', '').replace(', Netherlands', '')}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200/60 p-2.5 rounded-lg">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <Anchor className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[10px] uppercase font-bold">Discharge Port</span>
          </div>
          <p className="text-slate-800 truncate font-semibold" title={dischargeName}>
            {dischargeName.replace(' Port', '').replace(', USA', '')}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200/60 p-2.5 rounded-lg">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <Wind className="w-3.5 h-3.5 text-sky-600" />
            <span className="text-[10px] uppercase font-bold">Vessel Speed</span>
          </div>
          <p className="text-slate-800 font-bold">
            {isMoving ? '19.4 knots' : '0.0 knots (At Anchor)'}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200/60 p-2.5 rounded-lg">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <Compass className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-[10px] uppercase font-bold">Current Bearing</span>
          </div>
          <p className="text-slate-800 font-bold">
            {isMoving ? '084° (Eastbound)' : '—'}
          </p>
        </div>
      </div>

      {/* Real-time Tracking Event Stream Feed */}
      <div className="mt-4 flex-grow overflow-y-auto max-h-36 pr-1 border-t border-slate-100 pt-3" id="tracking-logs-container">
        <div className="flex items-center gap-1.5 text-[10px] uppercase text-slate-400 tracking-wider font-mono font-bold mb-2">
          <Radio className="w-3 h-3 text-slate-500" />
          <span>Carrier Log Stream</span>
        </div>
        
        <div className="space-y-2.5">
          {container.trackingLogs && container.trackingLogs.length > 0 ? (
            [...container.trackingLogs].reverse().map((log) => (
              <div key={log.id} className="flex gap-2.5 items-start text-xs font-mono">
                <div className="flex flex-col items-center mt-0.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    log.status === 'Customs Hold' 
                      ? 'bg-red-500 ring-4 ring-red-500/10' 
                      : log.status === 'Delivered' 
                      ? 'bg-emerald-500 ring-4 ring-emerald-500/10'
                      : 'bg-blue-600 ring-4 ring-blue-600/10'
                  }`}></span>
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-baseline text-[10px] text-slate-400">
                    <span className="font-bold text-slate-800">{log.event}</span>
                    <span className="text-slate-400 font-normal">{new Date(log.timestamp).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-tight mt-0.5">{log.description}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-400 text-xs text-center font-mono py-4">No tracking entries received yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

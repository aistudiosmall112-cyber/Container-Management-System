import { Layers, AlertTriangle, ShieldCheck, Weight } from 'lucide-react';
import { Container } from '../types';

interface ContainerBayVisualizerProps {
  container: Container;
}

export default function ContainerBayVisualizer({ container }: ContainerBayVisualizerProps) {
  const is20ft = container.containerSize === '20ft';
  const weightKg = container.cargoWeight || 15000;
  
  // Standard structural limits for ocean containers
  const maxPayloadKg = is20ft ? 21600 : 26500; // standard payload weights
  const utilizationPct = Math.min(Math.round((weightKg / maxPayloadKg) * 100), 100);
  
  // Warnings based on cargo types and weights
  const isDangerous = container.itemDetails.toLowerCase().includes('dangerous') || 
                      container.itemDetails.toLowerCase().includes('battery') || 
                      container.itemDetails.toLowerCase().includes('lithium') ||
                      container.itemDetails.toLowerCase().includes('hazardous') ||
                      container.itemDetails.toLowerCase().includes('un3480');

  const isHeavySteel = container.itemDetails.toLowerCase().includes('steel') || 
                       container.itemDetails.toLowerCase().includes('coil') || 
                       weightKg > 22000;

  let loadStatusMessage = "Balanced Load Distribution";
  let statusColorClass = "text-emerald-700 bg-emerald-50 border-emerald-200";
  let isOverweight = weightKg > maxPayloadKg;

  if (isOverweight) {
    loadStatusMessage = "EXCEEDS MAXIMUM HIGHWAY WEIGHT LIMIT";
    statusColorClass = "text-red-700 bg-red-50 border-red-200 animate-pulse";
  } else if (isDangerous) {
    loadStatusMessage = "HAZARDOUS UN CLASS 9 REGULATED CONTAINER";
    statusColorClass = "text-amber-700 bg-amber-50 border-amber-200";
  } else if (isHeavySteel) {
    loadStatusMessage = "CONCENTRATED HEAVY POINT LOADS detected";
    statusColorClass = "text-blue-700 bg-blue-50 border-blue-200";
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 text-slate-800 flex flex-col h-full" id={`load-visualizer-${container.id}`}>
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-sm uppercase tracking-wider font-sans text-slate-900">
            Stowage Bay Load Plan ({container.containerSize})
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500">
          <Weight className="w-3.5 h-3.5 text-slate-400" />
          <span>Cargo: {weightKg.toLocaleString()} kg</span>
        </div>
      </div>

      {/* Cargo Stowage Schematic */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-4 flex flex-col justify-center items-center flex-grow mb-4 relative" id="container-schematic-area">
        <p className="absolute top-2 left-3 text-[9px] uppercase font-bold tracking-wider text-slate-400 font-mono">
          Container Blueprint Cross-Section
        </p>

        {/* 20ft vs 40ft Visual Schematic */}
        <div className={`relative border-2 border-slate-300 rounded-sm bg-slate-100 flex flex-col justify-end p-0.5 overflow-hidden ${
          is20ft ? 'w-48 h-28' : 'w-80 h-28'
        }`} id="metal-container-hull">
          
          {/* Ridged Container Steel Walls (Corrugated lines) */}
          <div className="absolute inset-x-0 top-0 h-1.5 bg-slate-200 border-b border-slate-300 flex justify-between px-2 opacity-50">
            {Array.from({ length: is20ft ? 8 : 16 }).map((_, i) => (
              <span key={i} className="w-1.5 h-full bg-slate-300 border-x border-slate-200"></span>
            ))}
          </div>

          {/* Stowed Cargo Blocks based on utilization */}
          <div className="w-full flex gap-1 justify-center items-end" id="cargo-stowage-grid">
            {/* Cargo Box 1 */}
            <div 
              style={{ height: `${Math.min(utilizationPct * 0.8, 80)}px` }}
              className={`w-1/3 rounded border flex flex-col justify-center items-center font-mono text-[10px] transition-all duration-500 ${
                isOverweight 
                  ? 'bg-red-50 border-red-300 text-red-700' 
                  : isDangerous 
                  ? 'bg-amber-50 border-amber-300 text-amber-700' 
                  : 'bg-emerald-50 border-emerald-300 text-emerald-700'
              }`}
            >
              <span className="opacity-70">AFT</span>
              <span className="font-bold text-[9px]">{Math.round(weightKg / 3).toLocaleString()}kg</span>
            </div>

            {/* Cargo Box 2 - Midship */}
            <div 
              style={{ height: `${Math.min(utilizationPct * 0.85, 82)}px` }}
              className={`w-1/3 rounded border flex flex-col justify-center items-center font-mono text-[10px] transition-all duration-500 ${
                isOverweight 
                  ? 'bg-red-50 border-red-300 text-red-700' 
                  : isDangerous 
                  ? 'bg-amber-50 border-amber-300 text-amber-700' 
                  : 'bg-blue-50 border-blue-300 text-blue-700'
              }`}
            >
              <span className="opacity-70">MID</span>
              <span className="font-bold text-[9px]">{Math.round(weightKg / 3).toLocaleString()}kg</span>
            </div>

            {/* Cargo Box 3 */}
            <div 
              style={{ height: `${Math.min(utilizationPct * 0.8, 80)}px` }}
              className={`w-1/3 rounded border flex flex-col justify-center items-center font-mono text-[10px] transition-all duration-500 ${
                isOverweight 
                  ? 'bg-red-50 border-red-300 text-red-700' 
                  : isDangerous 
                  ? 'bg-amber-50 border-amber-300 text-amber-700' 
                  : 'bg-emerald-50 border-emerald-300 text-emerald-700'
              }`}
            >
              <span className="opacity-70">FWD</span>
              <span className="font-bold text-[9px]">{Math.round(weightKg / 3).toLocaleString()}kg</span>
            </div>
          </div>

          {/* Hazardous UN placard icon */}
          {isDangerous && (
            <div className="absolute top-4 right-4 bg-orange-600 text-white p-1 rounded font-mono font-bold text-[9px] border border-orange-400 animate-bounce">
              UN 3480
            </div>
          )}

          {/* Concentrated Load icon */}
          {isHeavySteel && (
            <div className="absolute top-4 left-4 bg-slate-800 text-sky-400 p-1 rounded font-mono font-bold text-[8px] border border-sky-600">
              HEAVY SLAB
            </div>
          )}
        </div>

        {/* Load Plan Status Badge */}
        <div className={`mt-3 w-full border rounded p-1.5 flex items-center justify-center gap-1.5 font-mono text-[10px] font-semibold tracking-wider ${statusColorClass}`} id="load-status-badge">
          {isOverweight || isDangerous ? (
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          <span>{loadStatusMessage}</span>
        </div>
      </div>

      {/* Numerical Stowage Details */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono" id="stowage-stats-grid">
        <div className="bg-slate-50 border border-slate-200/60 p-2 rounded-lg">
          <p className="text-slate-500 text-[10px] uppercase font-bold">Payload Space</p>
          <p className="text-slate-800 font-bold mt-1">{is20ft ? '33.2 CBM' : '67.7 CBM'}</p>
        </div>
        
        <div className="bg-slate-50 border border-slate-200/60 p-2 rounded-lg">
          <p className="text-slate-500 text-[10px] uppercase font-bold">Max Struct WT</p>
          <p className="text-slate-800 font-bold mt-1">{(maxPayloadKg).toLocaleString()} kg</p>
        </div>

        <div className="bg-slate-50 border border-slate-200/60 p-2 rounded-lg">
          <p className="text-slate-500 text-[10px] uppercase font-bold">Utilized Vol</p>
          <p className={`font-bold mt-1 ${utilizationPct > 90 ? 'text-red-600' : 'text-emerald-600'}`}>
            {utilizationPct}%
          </p>
        </div>
      </div>
    </div>
  );
}

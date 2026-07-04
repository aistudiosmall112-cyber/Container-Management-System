import { BarChart3, Sparkles, DollarSign, ShieldAlert, Anchor, TrendingUp } from 'lucide-react';
import { Container } from '../types';

interface DashboardStatsProps {
  containers: Container[];
  isAdmin?: boolean;
}

export default function DashboardStats({ containers, isAdmin = false }: DashboardStatsProps) {
  const totalShipments = containers.length;
  
  // Calculations
  const totalDealCapital = containers.reduce((acc, c) => acc + c.dealAmount, 0);
  const totalAdvancePaid = containers.reduce((acc, c) => acc + c.advancePayment, 0);
  const totalBalanceDue = containers.reduce((acc, c) => {
    return acc + (c.dealAmount - c.advancePayment);
  }, 0);

  const activeHolds = containers.filter(c => c.status === 'Customs Hold').length;
  const activeInTransit = containers.filter(c => c.status === 'In Transit (Ocean)' || c.status === 'Out for Delivery').length;
  const completedDeliveries = containers.filter(c => c.status === 'Delivered').length;

  const totalCargoWeightKg = containers.reduce((acc, c) => acc + (c.cargoWeight || 0), 0);

  if (isAdmin) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-stats-grid">
        {/* Capital Stowed Card */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow transition-shadow flex justify-between items-start" id="stat-capital-stowed">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">Total Capital Stowed</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
              USD {totalDealCapital.toLocaleString()}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-2 font-mono">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>Across {totalShipments} registered contracts</span>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-lg text-blue-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Outstanding Balance Card */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow transition-shadow flex justify-between items-start" id="stat-outstanding-balance">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">Broker Balance Due</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
              USD {totalBalanceDue.toLocaleString()}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-2 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Advance: USD {totalAdvancePaid.toLocaleString()} paid</span>
            </div>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 p-2.5 rounded-lg text-indigo-600">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>

        {/* Active Customs Holds */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow transition-shadow flex justify-between items-start" id="stat-active-holds">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">Customs Hold Gate</p>
            <p className={`text-2xl font-bold tracking-tight font-sans ${activeHolds > 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {activeHolds} Containers
            </p>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-2 font-mono">
              <ShieldAlert className={`w-3.5 h-3.5 ${activeHolds > 0 ? 'text-red-500 animate-bounce' : 'text-slate-400'}`} />
              <span>Requires intensive broker clearances</span>
            </div>
          </div>
          <div className={`p-2.5 rounded-lg border ${
            activeHolds > 0 
              ? 'bg-red-50 border-red-100 text-red-600' 
              : 'bg-slate-50 border-slate-100 text-slate-400'
          }`}>
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Shipments Status Flow */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow transition-shadow flex justify-between items-start" id="stat-active-transit">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">Ocean Transit Flow</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
              {activeInTransit} Sailing
            </p>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-2 font-mono">
              <Anchor className="w-3.5 h-3.5 text-emerald-500" />
              <span>{completedDeliveries} delivered • {totalCargoWeightKg.toLocaleString()} kg total</span>
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg text-emerald-600">
            <Anchor className="w-5 h-5" />
          </div>
        </div>
      </div>
    );
  }

  // Non-admin / Regular User view: Only show Outstanding Balance Card
  return (
    <div className="flex justify-center" id="dashboard-stats-grid">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 w-full max-w-md flex justify-between items-center" id="stat-outstanding-balance">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">Broker Balance Due</p>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
            USD {totalBalanceDue.toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-2 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Advance payments: USD {totalAdvancePaid.toLocaleString()} paid</span>
          </div>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl text-indigo-600">
          <BarChart3 className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}


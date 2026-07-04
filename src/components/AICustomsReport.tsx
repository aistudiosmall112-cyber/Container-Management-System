import { useState, useEffect } from 'react';
import { Cpu, CheckSquare, Square, AlertOctagon, HelpCircle, RefreshCw, FileText, Compass, ShieldAlert } from 'lucide-react';
import { Container, AIAnalysisResult } from '../types';

interface AICustomsReportProps {
  container: Container;
}

export default function AICustomsReport({ container }: AICustomsReportProps) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  // Reset report cache when container changes
  useEffect(() => {
    setReport(null);
    setError('');
    setCheckedSteps({});
  }, [container.id]);

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const activeToken = localStorage.getItem('cms_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }

      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify({ container }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Logistics AI extraction failed.');
      }

      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Unable to connect to Gemini API. Please configure your key.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (index: number) => {
    setCheckedSteps(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Status color helpers
  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-emerald-600';
    if (score < 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getDemurrageBg = (risk: string) => {
    if (risk === 'Low') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (risk === 'Medium') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-red-50 text-red-700 border-red-200 animate-pulse';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 text-slate-800 flex flex-col h-full" id={`ai-customs-analysis-${container.id}`}>
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-purple-600 animate-pulse" />
          <h3 className="font-bold text-sm uppercase tracking-wider font-sans text-slate-900">
            Gemini Customs & Importer Advisory
          </h3>
        </div>
        {report && (
          <button
            onClick={runAnalysis}
            disabled={loading}
            id="re-analyze-btn"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-50 font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-evaluate</span>
          </button>
        )}
      </div>

      {!report && !loading && (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center flex-grow" id="empty-ai-state">
          <div className="w-12 h-12 bg-purple-50 border border-purple-100 rounded-full flex items-center justify-center mb-4 text-purple-600">
            <Cpu className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-sm text-slate-800">AI Customs Assessment Pending</h4>
          <p className="text-xs text-slate-500 mt-1.5 max-w-xs leading-relaxed">
            Run standard customs broker checks and assess demurrage, tariff bands, and paperwork requirements for this shipment.
          </p>
          <button
            onClick={runAnalysis}
            id="start-ai-analysis-btn"
            className="mt-5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg text-xs cursor-pointer flex items-center gap-2 transition-all shadow-md shadow-purple-600/10"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Generate Importer Expert Report</span>
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center flex-grow font-mono text-xs text-slate-600" id="ai-loading-state">
          <div className="relative w-12 h-12 mb-4">
            <span className="absolute inset-0 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></span>
          </div>
          <p className="text-purple-700 font-bold mb-1 tracking-widest animate-pulse font-sans">EXTRACTING LOGISTICS COGNITIONS</p>
          <div className="text-[10px] space-y-0.5 text-slate-500 mt-2 max-w-xs leading-tight font-mono">
            <p>• Scrutinizing tariff chapters & HTS limits...</p>
            <p>• Calculating port congestion demurrage buffers...</p>
            <p>• Assessing payment outstanding wire delay triggers...</p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600" id="ai-error-state">
          <p className="font-bold flex items-center gap-1.5 mb-1 text-red-700 font-sans">
            <ShieldAlert className="w-4 h-4" />
            <span>Advisory Extraction Restricted</span>
          </p>
          <p className="leading-relaxed mb-3">{error}</p>
          <button
            onClick={runAnalysis}
            className="px-3 py-1.5 bg-white border border-red-200 hover:border-red-300 hover:bg-red-50 text-red-700 font-semibold rounded cursor-pointer transition-colors text-xs"
          >
            Retry Execution
          </button>
        </div>
      )}

      {report && !loading && (
        <div className="space-y-4 flex-grow overflow-y-auto max-h-[28rem] pr-1" id="ai-report-body">
          {/* Top KPI row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Risk Meter Card */}
            <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-lg flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-bold">Customs Risk</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className={`text-2xl font-bold font-mono ${getRiskColor(report.riskScore)}`}>
                  {report.riskScore}/100
                </span>
                <span className="text-[10px] text-slate-500">Score</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  style={{ width: `${report.riskScore}%` }}
                  className={`h-full ${
                    report.riskScore < 30 ? 'bg-emerald-500' : report.riskScore < 60 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                ></div>
              </div>
            </div>

            {/* Demurrage Penalty Risk */}
            <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-lg flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-bold">Demurrage Risk</span>
              <div className="mt-1.5">
                <span className={`inline-block border text-xs px-2 py-0.5 rounded font-mono font-bold ${getDemurrageBg(report.demurrageRisk)}`}>
                  {report.demurrageRisk} RISK
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 font-mono leading-tight">
                {report.demurrageRisk === 'High' 
                  ? 'Gated storage penalty fees highly probable. Immediate discharge action requested.' 
                  : 'Stowage limits within standard port free-time terms.'}
              </p>
            </div>
          </div>

          {/* HS Customs Classifications */}
          <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-lg">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider font-sans mb-2">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Suggested HTS/HS Code Matches</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {report.hsCodeSuggestions.map((hs, i) => (
                <span key={i} className="bg-white border border-slate-200 px-2.5 py-1 rounded text-xs font-mono text-slate-700 font-bold">
                  {hs}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-2 leading-tight">
              {report.customsDutyEstimate}
            </p>
          </div>

          {/* Payment Terms Risk Summary */}
          {container.dealAmount - container.advancePayment > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-amber-800 tracking-wider font-sans mb-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Financial Outstanding Risk</span>
              </div>
              <p className="text-slate-700 text-[11px] leading-relaxed font-mono font-medium">
                {report.paymentRiskSummary}
              </p>
            </div>
          )}

          {/* Custom clearance steps (Interactive checklist!) */}
          <div>
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-500 tracking-wider font-sans mb-2">
              <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
              <span>Broker Clearance Checklist</span>
            </div>
            <div className="space-y-1.5">
              {report.checklist.map((step, index) => {
                const isChecked = !!checkedSteps[index];
                return (
                  <button
                    key={index}
                    onClick={() => toggleCheck(index)}
                    className="w-full flex items-start gap-2.5 text-left p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 hover:border-slate-300 rounded-lg text-xs transition-all cursor-pointer font-sans"
                  >
                    <span className="text-slate-400 mt-0.5 flex-shrink-0">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 hover:text-slate-800" />
                      )}
                    </span>
                    <span className={`leading-snug ${isChecked ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}>
                      {step}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Importer Expert Advisory Note */}
          <div className="bg-purple-50 border border-purple-200 p-3.5 rounded-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5">
              <Cpu className="w-16 h-16 text-purple-600" />
            </div>
            <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider font-sans block mb-1">
              Broker Advisory Notice
            </span>
            <p className="text-slate-700 text-xs italic leading-relaxed font-sans">
              "{report.expertAdvice}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, User, FileText, Anchor, Scale, Settings, ShieldCheck, AlertCircle } from 'lucide-react';
import { Container, ContainerStatus } from '../types';

interface ContainerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (container: Partial<Container>) => void;
  containerToEdit?: Container | null;
}

const PORTS = [
  'Tianjin Port, China',
  'Nhava Sheva Port, India',
  'Port of Rotterdam, Netherlands',
  'Port of Los Angeles, USA',
  'Port of Houston, USA',
  'Port of New York, USA'
];

const STATUS_OPTIONS: { value: ContainerStatus; label: string; desc: string }[] = [
  { value: 'Booked', label: 'Booked', desc: 'Freight booked; shipping documents stowed' },
  { value: 'Empty Pickup', label: 'Empty Pickup', desc: 'Empty shipping box released to shipper yard' },
  { value: 'Loaded at Port', label: 'Loaded at Port', desc: 'Gated at loading terminal, export custom cleared' },
  { value: 'In Transit (Ocean)', label: 'In Transit', desc: 'Vessel stowed, container in ocean transit' },
  { value: 'At Port of Discharge', label: 'At Destination Port', desc: 'Vessel berthed, container stowed in stack' },
  { value: 'Customs Hold', label: 'Customs Hold', desc: 'Custom broker hold, FDA or Border Force inspection active' },
  { value: 'Customs Clearance', label: 'Customs Clearance', desc: 'Duties calculated, entry release granted' },
  { value: 'Out for Delivery', label: 'Out for Delivery', desc: 'Gated out on chassis, drayage transport active' },
  { value: 'Delivered', label: 'Delivered', desc: 'Gated in at consignee warehouse, seal intact' }
];

export default function ContainerDetailsModal({
  isOpen,
  onClose,
  onSave,
  containerToEdit
}: ContainerDetailsModalProps) {
  // Local states
  const [containerNumber, setContainerNumber] = useState('');
  const [blNumber, setBlNumber] = useState('');
  const [status, setStatus] = useState<ContainerStatus>('Booked');
  const [dealAmount, setDealAmount] = useState<number>(0);
  const [advancePayment, setAdvancePayment] = useState<number>(0);
  const [eta, setEta] = useState('');
  const [partyName, setPartyName] = useState('');
  const [itemDetails, setItemDetails] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [dealDate, setDealDate] = useState('');
  const [containerSize, setContainerSize] = useState<'20ft' | '40ft'>('20ft');
  const [vesselName, setVesselName] = useState('');
  const [voyageNumber, setVoyageNumber] = useState('');
  const [cargoWeight, setCargoWeight] = useState<number>(18000);
  const [portOfLoading, setPortOfLoading] = useState(PORTS[0]);
  const [portOfDischarge, setPortOfDischarge] = useState(PORTS[3]);

  // Validations
  const [numberWarning, setNumberWarning] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (containerToEdit) {
      setContainerNumber(containerToEdit.containerNumber);
      setBlNumber(containerToEdit.blNumber);
      setStatus(containerToEdit.status);
      setDealAmount(containerToEdit.dealAmount);
      setAdvancePayment(containerToEdit.advancePayment);
      setEta(containerToEdit.eta);
      setPartyName(containerToEdit.partyName);
      setItemDetails(containerToEdit.itemDetails);
      setPaymentTerms(containerToEdit.paymentTerms);
      setDealDate(containerToEdit.dealDate);
      setContainerSize(containerToEdit.containerSize || '20ft');
      setVesselName(containerToEdit.vesselName || '');
      setVoyageNumber(containerToEdit.voyageNumber || '');
      setCargoWeight(containerToEdit.cargoWeight || 18000);
      setPortOfLoading(containerToEdit.portOfLoading || PORTS[0]);
      setPortOfDischarge(containerToEdit.portOfDischarge || PORTS[3]);
      setNumberWarning('');
      setValidationError('');
    } else {
      // Clear forms
      setContainerNumber('');
      setBlNumber('');
      setStatus('Booked');
      setDealAmount(50000);
      setAdvancePayment(15000);
      setEta(new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0]); // ETA + 20 Days
      setPartyName('');
      setItemDetails('');
      setPaymentTerms('30% TT Advance, 70% against BL');
      setDealDate(new Date().toISOString().split('T')[0]);
      setContainerSize('40ft');
      setVesselName('MSC LUNA');
      setVoyageNumber('021W');
      setCargoWeight(19200);
      setPortOfLoading(PORTS[0]);
      setPortOfDischarge(PORTS[3]);
      setNumberWarning('');
      setValidationError('');
    }
  }, [containerToEdit, isOpen]);

  // Container number standard format check (ISO 6346: 4 letters + 7 digits)
  const handleContainerNumberChange = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setContainerNumber(clean);

    if (clean.length > 0) {
      const match = clean.match(/^[A-Z]{4}\d{7}$/);
      if (!match) {
        setNumberWarning('Container ISO 6346 standard: 4 letters followed by 7 digits (e.g., MSKU1234567)');
      } else {
        setNumberWarning('');
      }
    } else {
      setNumberWarning('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Strict Validations
    if (!containerNumber) {
      setValidationError('Container Number is required.');
      return;
    }
    if (!blNumber) {
      setValidationError('Bill of Lading (BL) Number is required.');
      return;
    }
    if (!partyName) {
      setValidationError('Consignee/Party Name is required.');
      return;
    }
    if (advancePayment > dealAmount) {
      setValidationError('Advance payment cannot exceed the total Deal Amount.');
      return;
    }

    const payload: Partial<Container> = {
      containerNumber,
      blNumber,
      status,
      dealAmount: Number(dealAmount),
      advancePayment: Number(advancePayment),
      eta,
      partyName,
      itemDetails,
      paymentTerms,
      dealDate,
      containerSize,
      vesselName,
      voyageNumber,
      cargoWeight: Number(cargoWeight),
      portOfLoading,
      portOfDischarge,
    };

    if (containerToEdit) {
      payload.id = containerToEdit.id;
      payload.trackingLogs = containerToEdit.trackingLogs;
    }

    onSave(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" id="details-modal-root">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col my-8 animate-in fade-in zoom-in-95 duration-200" id="details-modal-card">
        
        {/* Modal Header */}
        <div className="bg-slate-950 px-6 py-4 flex justify-between items-center border-b border-slate-800 text-white">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400 animate-spin" style={{ animationDuration: '6s' }} />
            <h2 className="text-lg font-bold tracking-tight">
              {containerToEdit ? `Configure Shipment: ${containerToEdit.containerNumber}` : 'Record New Shipment Container'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            id="close-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-600" id="modal-validation-error">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* SECTION 1: CORE IDENTIFIERS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Container ID (ISO-6346)</span>
              </label>
              <input
                type="text"
                id="input-container-number"
                value={containerNumber}
                onChange={(e) => handleContainerNumberChange(e.target.value)}
                placeholder="e.g. MSKU1942085"
                maxLength={11}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
              {numberWarning && (
                <p className="text-[10px] text-amber-600 mt-1 font-mono leading-tight flex items-center gap-1" id="container-number-warning">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  <span>{numberWarning}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Bill of Lading (BL) Number</span>
              </label>
              <input
                type="text"
                id="input-bl-number"
                value={blNumber}
                onChange={(e) => setBlNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="e.g. MAEU92041924"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
            </div>
          </div>

          {/* SECTION 2: CARGO DETAILS & PARTY */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Consignee / Party Name</span>
              </label>
              <input
                type="text"
                id="input-party-name"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="e.g. SinoSteel Manufacturing Corp"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-slate-400" />
                  <span>Gross Weight (kg)</span>
                </label>
                <input
                  type="number"
                  id="input-cargo-weight"
                  value={cargoWeight}
                  onChange={(e) => setCargoWeight(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  ISO Size
                </label>
                <select
                  id="input-container-size"
                  value={containerSize}
                  onChange={(e) => setContainerSize(e.target.value as '20ft' | '40ft')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm cursor-pointer"
                >
                  <option value="20ft">20ft Dry Van</option>
                  <option value="40ft">40ft High Cube</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Specific Cargo Item Details
            </label>
            <textarea
              id="input-item-details"
              value={itemDetails}
              onChange={(e) => setItemDetails(e.target.value)}
              placeholder="e.g. Cold-Rolled Steel Coils, Grade S235JR. Net Weight: 24,500 kg. Packed in eye-to-sky steel packaging."
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm leading-relaxed"
            ></textarea>
          </div>

          {/* SECTION 3: DEALS & FINANCE */}
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200 pb-1.5 font-mono flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-blue-500" />
              <span>Commercial Terms & Outstanding Ledger</span>
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Contract Amount (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-xs">$</span>
                  <input
                    type="number"
                    id="input-deal-amount"
                    value={dealAmount}
                    onChange={(e) => setDealAmount(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Advance Paid (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-xs">$</span>
                  <input
                    type="number"
                    id="input-advance-payment"
                    value={advancePayment}
                    onChange={(e) => setAdvancePayment(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Agreement Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="input-deal-date"
                    value={dealDate}
                    onChange={(e) => setDealDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Agreed Payment Milestones
              </label>
              <input
                type="text"
                id="input-payment-terms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g. 30% TT advance, 70% against BL presentation"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* SECTION 4: VESSEL TELEMETRY & ROUTE */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                <Anchor className="w-3.5 h-3.5 text-slate-400" />
                <span>Ocean Carrier Vessel</span>
              </label>
              <input
                type="text"
                id="input-vessel-name"
                value={vesselName}
                onChange={(e) => setVesselName(e.target.value)}
                placeholder="e.g. MAERSK GIBRALTAR"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Voyage Number
              </label>
              <input
                type="text"
                id="input-voyage-number"
                value={voyageNumber}
                onChange={(e) => setVoyageNumber(e.target.value)}
                placeholder="e.g. 024W"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Estimated Arrival (ETA)</span>
              </label>
              <input
                type="date"
                id="input-eta"
                value={eta}
                onChange={(e) => setEta(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Port of Loading (POL)
              </label>
              <select
                id="input-port-of-loading"
                value={portOfLoading}
                onChange={(e) => setPortOfLoading(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm cursor-pointer"
              >
                {PORTS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Port of Discharge (POD)
              </label>
              <select
                id="input-port-of-discharge"
                value={portOfDischarge}
                onChange={(e) => setPortOfDischarge(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm cursor-pointer"
              >
                {PORTS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* SECTION 5: STATUS UPDATE TRACKING */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Shipment Tracking Status
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2" id="status-radio-selection">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  id={`status-opt-${opt.value}`}
                  onClick={() => setStatus(opt.value)}
                  className={`flex flex-col text-left p-2.5 border rounded-lg transition-all text-xs cursor-pointer ${
                    status === opt.value
                      ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="font-bold flex items-center gap-1.5">
                    {status === opt.value && <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />}
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 leading-tight">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200" id="modal-footer-buttons">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-sm transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-container-submit-btn"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm transition-colors cursor-pointer shadow-md shadow-blue-600/10"
            >
              {containerToEdit ? 'Publish Updates' : 'Add to Ledger'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

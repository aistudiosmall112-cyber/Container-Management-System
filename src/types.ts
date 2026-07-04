export type ContainerStatus =
  | 'Booked'
  | 'Empty Pickup'
  | 'Loaded at Port'
  | 'In Transit (Ocean)'
  | 'At Port of Discharge'
  | 'Customs Clearance'
  | 'Customs Hold'
  | 'Out for Delivery'
  | 'Delivered';

export interface TrackingLog {
  id: string;
  timestamp: string;
  event: string;
  location: string;
  status: ContainerStatus;
  description: string;
}

export interface Container {
  id: string;
  containerNumber: string;
  blNumber: string;
  status: ContainerStatus;
  dealAmount: number;
  eta: string;
  partyName: string;
  itemDetails: string;
  paymentTerms: string;
  advancePayment: number;
  dealDate: string;
  containerSize: '20ft' | '40ft';
  vesselName: string;
  voyageNumber: string;
  cargoWeight: number; // in kg
  trackingLogs: TrackingLog[];
  portOfLoading: string;
  portOfDischarge: string;
}

export interface User {
  username: string;
  role: 'importer_expert' | 'senior_developer' | 'logistics_manager';
  email: string;
}

export interface AIAnalysisResult {
  riskScore: number; // 0 to 100
  demurrageRisk: 'Low' | 'Medium' | 'High';
  customsDutyEstimate: string;
  checklist: string[];
  hsCodeSuggestions: string[];
  paymentRiskSummary: string;
  expertAdvice: string;
}

export interface Device {
  id: string;
  serialNumber: string;
  patientName: string;
  status: "online" | "offline" | "error" | "stopped";
  remainingPouches: number;
  totalPouches: number;
  refillThreshold: number;
  lastDispensed: string;
  assignedCaregiver: string;
  issueDate: string;
  validityDate: string;
  pharmacyName: string;
}

export interface HelpRequest {
  id: string;
  deviceId: string;
  timestamp: string;
  status: "pending" | "resolved" | "in_progress";
  description: string;
  patientName: string;
  /** Set when status is resolved: how the issue was resolved */
  resolutionReason?: string;
}

export interface Caregiver {
  id: string;
  name: string;
  email: string;
  phone: string;
  linkedDevices: string[];
  status: "active" | "inactive";
}

export interface ActivityLog {
  id: string;
  deviceId: string;
  timestamp: string;
  type: "dispense" | "refill" | "error" | "stop" | "start" | "help";
  description: string;
}

export interface RefillNotification {
  id: string;
  deviceId: string;
  patientName: string;
  remainingPouches: number;
  threshold: number;
  timestamp: string;
  urgent: boolean;
}

/** Patient medication line for add-patient flow */
export interface PatientMedication {
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
}

/** Patient as added by pharmacy: basic info, medication, prescription, assigned device */
export interface Patient {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  address: string;
  medications: PatientMedication[];
  prescriptionNotes: string;
  prescriptionFileName?: string;
  assignedDeviceId: string | null;
  assignedDeviceSerial?: string;
  createdAt: string;
}

/** Device in inventory not yet assigned to a patient (for assign step in add-patient) */
export interface UnassignedDevice {
  id: string;
  serialNumber: string;
}

// Mock data intentionally removed.
// The Pharmacy Panel now fetches live data from the backend APIs.

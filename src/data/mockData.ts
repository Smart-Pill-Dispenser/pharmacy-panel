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

export const mockDevices: Device[] = [
  { id: "DEV-001", serialNumber: "SN-2024-00101", patientName: "John Carter", status: "online", remainingPouches: 8, totalPouches: 30, refillThreshold: 5, lastDispensed: "2026-02-16 08:00", assignedCaregiver: "Sarah Wilson", issueDate: "2025-12-01", validityDate: "2026-06-01", pharmacyName: "MedCare Pharmacy" },
  { id: "DEV-002", serialNumber: "SN-2024-00102", patientName: "Emma Davis", status: "online", remainingPouches: 22, totalPouches: 30, refillThreshold: 5, lastDispensed: "2026-02-16 07:30", assignedCaregiver: "Mike Johnson", issueDate: "2026-01-15", validityDate: "2026-07-15", pharmacyName: "MedCare Pharmacy" },
  { id: "DEV-003", serialNumber: "SN-2024-00103", patientName: "Robert Smith", status: "error", remainingPouches: 3, totalPouches: 30, refillThreshold: 5, lastDispensed: "2026-02-15 20:00", assignedCaregiver: "Sarah Wilson", issueDate: "2025-11-20", validityDate: "2026-05-20", pharmacyName: "MedCare Pharmacy" },
  { id: "DEV-004", serialNumber: "SN-2024-00104", patientName: "Lisa Brown", status: "stopped", remainingPouches: 15, totalPouches: 30, refillThreshold: 5, lastDispensed: "2026-02-14 09:00", assignedCaregiver: "Tom Anderson", issueDate: "2026-01-05", validityDate: "2026-07-05", pharmacyName: "MedCare Pharmacy" },
  { id: "DEV-005", serialNumber: "SN-2024-00105", patientName: "Mary Johnson", status: "offline", remainingPouches: 0, totalPouches: 30, refillThreshold: 5, lastDispensed: "2026-02-10 12:00", assignedCaregiver: "Mike Johnson", issueDate: "2025-10-01", validityDate: "2026-04-01", pharmacyName: "MedCare Pharmacy" },
  { id: "DEV-006", serialNumber: "SN-2024-00106", patientName: "James Wilson", status: "online", remainingPouches: 18, totalPouches: 30, refillThreshold: 5, lastDispensed: "2026-02-16 06:45", assignedCaregiver: "Tom Anderson", issueDate: "2026-02-01", validityDate: "2026-08-01", pharmacyName: "MedCare Pharmacy" },
];

export const mockHelpRequests: HelpRequest[] = [
  { id: "HR-001", deviceId: "DEV-003", timestamp: "2026-02-16 09:15", status: "pending", description: "Device showing error LED. Unable to dispense medication.", patientName: "Robert Smith" },
  { id: "HR-002", deviceId: "DEV-005", timestamp: "2026-02-15 14:30", status: "in_progress", description: "Device went offline. Patient unable to get medication.", patientName: "Mary Johnson" },
  { id: "HR-003", deviceId: "DEV-001", timestamp: "2026-02-14 11:00", status: "resolved", description: "Pouch jammed in dispenser.", patientName: "John Carter" },
];

export const mockCaregivers: Caregiver[] = [
  { id: "CG-001", name: "Sarah Wilson", email: "sarah.wilson@care.com", phone: "+1 555-0101", linkedDevices: ["DEV-001", "DEV-003"], status: "active" },
  { id: "CG-002", name: "Mike Johnson", email: "mike.johnson@care.com", phone: "+1 555-0102", linkedDevices: ["DEV-002", "DEV-005"], status: "active" },
  { id: "CG-003", name: "Tom Anderson", email: "tom.anderson@care.com", phone: "+1 555-0103", linkedDevices: ["DEV-004", "DEV-006"], status: "active" },
  { id: "CG-004", name: "Jane Roberts", email: "jane.roberts@care.com", phone: "+1 555-0104", linkedDevices: [], status: "inactive" },
];

export const mockActivityLogs: ActivityLog[] = [
  { id: "LOG-001", deviceId: "DEV-001", timestamp: "2026-02-16 08:00", type: "dispense", description: "Morning medication dispensed successfully" },
  { id: "LOG-002", deviceId: "DEV-002", timestamp: "2026-02-16 07:30", type: "dispense", description: "Morning medication dispensed successfully" },
  { id: "LOG-003", deviceId: "DEV-003", timestamp: "2026-02-16 09:15", type: "error", description: "Dispensing mechanism jammed — Error code E-201" },
  { id: "LOG-004", deviceId: "DEV-004", timestamp: "2026-02-14 09:00", type: "stop", description: "Dispensing stopped by authorized pharmacy admin" },
  { id: "LOG-005", deviceId: "DEV-001", timestamp: "2026-02-15 20:00", type: "dispense", description: "Evening medication dispensed successfully" },
  { id: "LOG-006", deviceId: "DEV-003", timestamp: "2026-02-15 20:00", type: "help", description: "Help request submitted by caregiver" },
  { id: "LOG-007", deviceId: "DEV-005", timestamp: "2026-02-10 12:00", type: "dispense", description: "Last medication dispensed before device went offline" },
  { id: "LOG-008", deviceId: "DEV-006", timestamp: "2026-02-16 06:45", type: "dispense", description: "Morning medication dispensed successfully" },
  { id: "LOG-009", deviceId: "DEV-002", timestamp: "2026-02-15 14:00", type: "refill", description: "Device refilled — 30 pouches loaded" },
  { id: "LOG-010", deviceId: "DEV-001", timestamp: "2026-02-13 10:00", type: "start", description: "Device restarted after maintenance" },
];

export const mockRefillNotifications: RefillNotification[] = [
  { id: "RN-001", deviceId: "DEV-005", patientName: "Mary Johnson", remainingPouches: 0, threshold: 5, timestamp: "2026-02-16 08:00", urgent: true },
  { id: "RN-002", deviceId: "DEV-003", patientName: "Robert Smith", remainingPouches: 3, threshold: 5, timestamp: "2026-02-16 07:00", urgent: true },
  { id: "RN-003", deviceId: "DEV-001", patientName: "John Carter", remainingPouches: 8, threshold: 5, timestamp: "2026-02-16 06:00", urgent: false },
];

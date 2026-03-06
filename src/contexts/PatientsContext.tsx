import React, { createContext, useContext, useState, useCallback } from "react";
import type { Patient } from "@/data/mockData";

interface PatientsContextValue {
  patients: Patient[];
  addPatient: (patient: Patient) => void;
}

const PatientsContext = createContext<PatientsContextValue | null>(null);

export const PatientsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const addPatient = useCallback((patient: Patient) => {
    setPatients((prev) => [...prev, patient]);
  }, []);
  return (
    <PatientsContext.Provider value={{ patients, addPatient }}>
      {children}
    </PatientsContext.Provider>
  );
};

export function usePatients(): PatientsContextValue {
  const ctx = useContext(PatientsContext);
  if (!ctx) throw new Error("usePatients must be used within PatientsProvider");
  return ctx;
}

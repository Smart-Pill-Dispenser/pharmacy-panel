import React from "react";
import { useNavigate } from "react-router-dom";
import { Monitor, Search } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { mockDevices } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Devices: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");

  const filtered = mockDevices.filter(
    (d) =>
      d.patientName.toLowerCase().includes(search.toLowerCase()) ||
      d.id.toLowerCase().includes(search.toLowerCase()) ||
      d.serialNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Devices</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage registered hardware devices</p>
        </div>
        <Button onClick={() => navigate("/bulk-upload")}>Upload Serials</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search devices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Device</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Serial</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Patient</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Pouches</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Caregiver</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((device) => (
              <tr
                key={device.id}
                className="hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate(`/devices/${device.id}`)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-card-foreground">{device.id}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{device.serialNumber}</td>
                <td className="px-4 py-3 text-sm text-card-foreground">{device.patientName}</td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(device.remainingPouches / device.totalPouches) * 100}%`,
                          backgroundColor: device.remainingPouches <= device.refillThreshold ? "hsl(var(--destructive))" : "hsl(var(--success))",
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{device.remainingPouches}/{device.totalPouches}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">{device.assignedCaregiver}</td>
                <td className="px-4 py-3"><StatusBadge status={device.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No devices found</div>
        )}
      </div>
    </div>
  );
};

export default Devices;

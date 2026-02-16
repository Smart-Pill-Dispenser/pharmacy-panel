import React from "react";
import { HelpCircle, Search } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { mockHelpRequests } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const HelpSupport: React.FC = () => {
  const [search, setSearch] = React.useState("");
  const [requests, setRequests] = React.useState(mockHelpRequests);

  const filtered = requests.filter(
    (r) =>
      r.patientName.toLowerCase().includes(search.toLowerCase()) ||
      r.deviceId.toLowerCase().includes(search.toLowerCase())
  );

  const handleResolve = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "resolved" as const } : r))
    );
    toast.success("Help request resolved");
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Help & Support</h1>
        <p className="text-sm text-muted-foreground mt-1">View and manage help requests from devices</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search requests..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Request ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Device</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Patient</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Timestamp</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((req) => (
              <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-card-foreground">{req.id}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-card-foreground">{req.deviceId}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{req.patientName}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{req.timestamp}</td>
                <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                <td className="px-4 py-3">
                  {req.status !== "resolved" && (
                    <Button variant="outline" size="sm" onClick={() => handleResolve(req.id)}>
                      Resolve
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No help requests found</div>
        )}
      </div>
    </div>
  );
};

export default HelpSupport;

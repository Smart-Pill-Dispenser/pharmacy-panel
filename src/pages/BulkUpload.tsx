import React, { useState, useRef } from "react";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface UploadResult {
  total: number;
  success: number;
  errors: string[];
}

const BulkUpload: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    // Mock upload process
    await new Promise((r) => setTimeout(r, 2000));

    const mockResult: UploadResult = {
      total: 25,
      success: 23,
      errors: ["Row 12: Invalid serial number format 'ABC'", "Row 19: Duplicate serial number 'SN-2024-00101'"],
    };

    setResult(mockResult);
    setUploading(false);
    toast.success("Upload complete", { description: `${mockResult.success}/${mockResult.total} serial numbers processed` });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
      setResult(null);
    }
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bulk Upload Serial Numbers</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload device or product serial numbers via Excel sheet</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card p-12 cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent mb-4">
          <Upload className="h-6 w-6 text-accent-foreground" />
        </div>
        <p className="text-sm font-medium text-card-foreground mb-1">
          {file ? file.name : "Drop your file here, or click to browse"}
        </p>
        <p className="text-xs text-muted-foreground">Supports .xlsx, .xls, .csv files</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* File info & upload */}
      {file && (
        <div className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-success" />
            <div>
              <p className="text-sm font-medium text-card-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => { setFile(null); setResult(null); }}>
              <X className="h-4 w-4" />
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload & Validate"}
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-4 shadow-card">
              <p className="text-sm text-muted-foreground">Total Entries</p>
              <p className="text-2xl font-bold text-card-foreground">{result.total}</p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-card border-l-4 border-l-success">
              <p className="text-sm text-muted-foreground">Successful</p>
              <p className="text-2xl font-bold text-success">{result.success}</p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-card border-l-4 border-l-destructive">
              <p className="text-sm text-muted-foreground">Errors</p>
              <p className="text-2xl font-bold text-destructive">{result.errors.length}</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-xl border bg-card shadow-card">
              <div className="flex items-center gap-2 border-b p-4">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <h3 className="font-semibold text-card-foreground">Upload Errors</h3>
              </div>
              <div className="divide-y">
                {result.errors.map((err, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 px-4">
                    <X className="h-3 w-3 text-destructive shrink-0" />
                    <p className="text-sm text-card-foreground">{err}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.success > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 p-4">
              <CheckCircle className="h-5 w-5 text-success" />
              <p className="text-sm text-card-foreground">{result.success} serial numbers successfully stored and validated.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkUpload;

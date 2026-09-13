import React, { useState } from 'react';
import { X, UploadCloud, CheckCircle2, FileText, Check } from 'lucide-react';
import { UserLayer } from '../types';

interface DataUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLayerApplied: (layer: UserLayer) => void;
  currentLocation?: [number, number] | null;
}

const SAMPLE_DRAINAGE_CSV = `drain_id,lat,lon,capacity_m3s,blockage_percent
D001,19.0725,72.8765,3.2,15
D002,19.0685,72.8790,2.1,45
D003,19.0805,72.8845,2.8,0
D004,19.0690,72.8715,4.5,25`;

const SAMPLE_ASSETS_CSV = `asset_id,name,lat,lon,type,capacity
A001,Bhabha Emergency Camp,19.0640,72.8805,Shelter,500
A002,BKC Disaster Ops Center,19.0665,72.8655,Command,120
A003,Kalina Relief Sump Pump,19.0760,72.8680,PumpStation,1200`;

export const DataUploadModal: React.FC<DataUploadModalProps> = ({
  isOpen,
  onClose,
  onLayerApplied,
  currentLocation = null,
}) => {
  const [datasetName, setDatasetName] = useState<string>('Kurla Ward Drainage Survey');
  const [dataType, setDataType] = useState<string>('drainage');
  const [fileContent, setFileContent] = useState<string>(SAMPLE_DRAINAGE_CSV);
  const [fileName, setFileName] = useState<string>('drainage-survey.csv');
  const [uploadStatus, setUploadStatus] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [applied, setApplied] = useState<boolean>(false);
  const [uploadLocation, setUploadLocation] = useState<[number, number] | null>(currentLocation);

  React.useEffect(() => {
    if (currentLocation) setUploadLocation(currentLocation);
  }, [currentLocation]);

  if (!isOpen) return null;

  const handleValidateAndUpload = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('dataset_name', datasetName);
      formData.append('data_type', dataType);
      formData.append('source', 'Municipal Field Team');
      if (uploadLocation) {
        formData.append('location_lat', String(uploadLocation[0]));
        formData.append('location_lon', String(uploadLocation[1]));
        formData.append('location_label', 'Browser current location');
      }
      formData.append('file', new File([fileContent], fileName, { type: 'text/csv' }));
      const res = await fetch('/api/upload/data', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setUploadStatus(data);
      }
    } catch (err) {
      console.error('Error uploading dataset:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLayer = async () => {
    if (!uploadStatus?.upload_id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/upload/apply/${uploadStatus.upload_id}`, { method: 'POST' });
      if (res.ok) {
        setApplied(true);
        setTimeout(() => {
          onLayerApplied({
            id: uploadStatus.upload_id,
            name: datasetName,
            data_type: dataType,
            source: 'User Upload',
            feature_count: uploadStatus.feature_count,
            features: [],
            active: true,
            applied_at: new Date().toISOString()
          });
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error('Error applying layer:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] isolate flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative z-[1001] bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Upload Custom Dataset & Field Survey
              </h3>
              <p className="text-xs text-slate-400">
                Section 27.2: CSV & GeoJSON Ingestion Pipeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Metadata Controls */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Dataset Name:</label>
              <input
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Data Category:</label>
              <select
                value={dataType}
                onChange={(e) => setDataType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="drainage">Municipal Drainage Network</option>
                <option value="emergency_assets">Emergency Relief Shelters</option>
                <option value="rainfall">Local Rain Gauge Series</option>
                <option value="roads">Custom Road Vectors</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-cyan-200">Dataset location context</div>
                <div className="mt-1 text-[10px] text-slate-400">
                  {uploadLocation ? `${uploadLocation[0].toFixed(5)}, ${uploadLocation[1].toFixed(5)}` : 'No browser location selected'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition(
                    (position) => setUploadLocation([position.coords.latitude, position.coords.longitude]),
                    () => setUploadLocation(null),
                  );
                }}
                className="rounded border border-cyan-500/50 bg-cyan-500/10 px-2.5 py-1.5 text-[10px] font-bold text-cyan-200 hover:bg-cyan-500/20"
              >
                Use current location
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Load Template:</span>
            <button
              type="button"
              onClick={() => {
                setDataType('drainage');
                setDatasetName('Kurla Ward Drainage Survey');
                setFileContent(SAMPLE_DRAINAGE_CSV);
              }}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition"
            >
              Drainage Survey CSV
            </button>
            <button
              type="button"
              onClick={() => {
                setDataType('emergency_assets');
                setDatasetName('Disaster Relief Assets');
                setFileContent(SAMPLE_ASSETS_CSV);
              }}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition"
            >
              Emergency Assets CSV
            </button>
          </div>

          {/* File Content / Editor */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Dataset file (CSV or GeoJSON with lat, lon):
            </label>
            <input
              type="file"
              accept=".csv,.json,.geojson"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setFileName(file.name);
                const reader = new FileReader();
                reader.onload = () => setFileContent(String(reader.result || ''));
                reader.readAsText(file);
              }}
              className="w-full mb-2 text-xs text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-cyan-500/20 file:px-3 file:py-1.5 file:text-cyan-300 hover:file:bg-cyan-500/30"
            />
            <textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              rows={6}
              className="w-full bg-slate-950 font-mono text-[11px] text-cyan-300/90 border border-slate-700 rounded-lg p-3 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Validation Result Box */}
          {uploadStatus && (
            <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
              uploadStatus.status === 'VALID' || uploadStatus.status === 'WARNING'
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : 'bg-red-950/30 border-red-500/40 text-red-200'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Validation Status: {uploadStatus.status}</span>
                </span>
                <span className="font-mono text-cyan-300">{uploadStatus.feature_count} Records Parsed</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Coordinates normalized to EPSG:4326. Ready to incorporate into digital twin simulation.
              </p>
              {uploadStatus.warnings?.length > 0 && (
                <div className="text-[10px] text-amber-300 pt-1">
                  Note: {uploadStatus.warnings[0]}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex justify-between items-center border-t border-slate-800">
            <span className="text-[11px] text-slate-500">Section 27.4 Validation Pipeline</span>
            <div className="flex gap-2">
              {!uploadStatus ? (
                <button
                  type="button"
                  onClick={handleValidateAndUpload}
                  disabled={loading || !fileContent.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{loading ? 'Validating...' : 'Validate & Parse'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApplyLayer}
                  disabled={loading || applied}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-md shadow-emerald-600/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{applied ? 'Layer Applied!' : 'Approve & Apply to Map'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

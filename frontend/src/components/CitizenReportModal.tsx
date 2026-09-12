import React, { useState } from 'react';
import { X, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { CitizenReport } from '../types';

interface CitizenReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: (report: CitizenReport) => void;
  defaultCoords?: [number, number];
}

export const CitizenReportModal: React.FC<CitizenReportModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess,
  defaultCoords = [19.0720, 72.8760],
}) => {
  const [waterDepth, setWaterDepth] = useState<string>('knee');
  const [customCm, setCustomCm] = useState<number>(45);
  const [roadStatus, setRoadStatus] = useState<'open' | 'partially blocked' | 'closed'>('partially blocked');
  const [drainStatus, setDrainStatus] = useState<'normal' | 'overflowing' | 'blocked' | 'unknown'>('overflowing');
  const [locationName, setLocationName] = useState<string>('LBS Marg Kurla');
  const [description, setDescription] = useState<string>('Water overflowing from drain inlet. Traffic severely slowed.');
  const [reporterType, setReporterType] = useState<string>('Citizen');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const depthVal = waterDepth === 'custom' ? customCm : waterDepth;

    try {
      const res = await fetch('/api/flood/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: defaultCoords,
          location_name: locationName,
          water_depth: String(depthVal),
          road_status: roadStatus,
          drain_status: drainStatus,
          description: description,
          reporter_type: reporterType,
          photo_url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=500'
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onSubmitSuccess(data.report);
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error('Error submitting citizen flood report:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Report Local Flood Observation
              </h3>
              <p className="text-xs text-slate-400">
                Section 27.3: Community & Field Incident Validation
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

        {success ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
            <h4 className="text-lg font-bold text-white">Report Submitted & Verified!</h4>
            <p className="text-xs text-slate-400">
              Your field observation has been pinned to the FLOOD-X live map and integrated into model validation.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Location & Reporter */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Location / Landmark:
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Reporter Role:
                </label>
                <select
                  value={reporterType}
                  onChange={(e) => setReporterType(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Citizen">Citizen / Commuter</option>
                  <option value="Field Officer">Field Officer (BMC/NDRF)</option>
                  <option value="Traffic Police">Traffic Police</option>
                  <option value="Emergency Operator">Emergency Operator</option>
                </select>
              </div>
            </div>

            {/* Water Depth Quick Selection (Section 27.3) */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Observed Water Depth:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'none', label: 'None (0cm)', cm: 0 },
                  { id: 'ankle', label: 'Ankle (15cm)', cm: 15 },
                  { id: 'knee', label: 'Knee (45cm)', cm: 45 },
                  { id: 'waist', label: 'Waist (85cm)', cm: 85 },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setWaterDepth(d.id);
                      setCustomCm(d.cm);
                    }}
                    className={`p-2 rounded-lg border text-center transition flex flex-col items-center ${
                      waterDepth === d.id
                        ? 'bg-blue-600/30 border-blue-500 text-cyan-300 font-bold'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-xs">{d.label.split(' ')[0]}</span>
                    <span className="text-[10px] text-slate-400">{d.label.split(' ')[1]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Road Status (Section 27.3) */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Road Traffic Status:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'open', label: 'Open (Slow)', color: 'border-emerald-500 text-emerald-400' },
                  { id: 'partially blocked', label: 'Partially Blocked', color: 'border-amber-500 text-amber-400' },
                  { id: 'closed', label: 'Fully Closed', color: 'border-red-500 text-red-400' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setRoadStatus(s.id as any)}
                    className={`p-2 rounded-lg border text-xs font-semibold text-center transition ${
                      roadStatus === s.id
                        ? `bg-slate-800 ${s.color} shadow-sm`
                        : 'bg-slate-800/40 border-slate-700 text-slate-400'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Drain Status */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Storm Drain Status:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'normal', label: 'Normal' },
                  { id: 'overflowing', label: 'Overflowing' },
                  { id: 'blocked', label: 'Silt Blocked' },
                  { id: 'unknown', label: 'Unknown' },
                ].map((ds) => (
                  <button
                    key={ds.id}
                    type="button"
                    onClick={() => setDrainStatus(ds.id as any)}
                    className={`py-1.5 px-2 rounded border text-xs transition ${
                      drainStatus === ds.id
                        ? 'bg-amber-600/30 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-800/40 border-slate-700 text-slate-400'
                    }`}
                  >
                    {ds.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Field Observation Notes:
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                placeholder="Describe water accumulation, stuck vehicles, or drainage issues..."
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-lg text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 transition shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting...' : 'Submit Field Report'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

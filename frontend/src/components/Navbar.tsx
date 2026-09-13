import React, { useState } from 'react';
import { Waves, AlertTriangle, ShieldCheck, MapPin, UploadCloud, PlusCircle, Search } from 'lucide-react';

interface NavbarProps {
  activeAlertCount: number;
  lastUpdate: string;
  onUseMyLocation: () => void;
  onOpenUploadModal: () => void;
  onOpenReportModal: () => void;
  onSelectLandmark: (coords: [number, number], name: string) => void;
  activePage: string;
  onNavigate: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeAlertCount,
  lastUpdate,
  onUseMyLocation,
  onOpenUploadModal,
  onOpenReportModal,
  onSelectLandmark,
  activePage,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length > 1) {
      try {
        const res = await fetch(`/api/location/search?query=${encodeURIComponent(val)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Error searching locations:', err);
      }
    } else {
      setShowDropdown(false);
    }
  };

  return (
    <header className="bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50">
      {/* Brand & Mission */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
          <Waves className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
              FLOOD-X
            </h1>
            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-800">
              SIH26085 • MoES / NCMRWF
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Urban Flood Digital Twin & Emergency Routing Platform
          </p>
        </div>
      </div>

      <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto border-t border-slate-800 pt-2 lg:order-none lg:w-auto lg:border-0 lg:pt-0" aria-label="Primary navigation">
        {[
          ['overview', 'Overview'],
          ['brief', 'Command Brief'],
          ['response', 'Critical Response'],
          ['routing', 'Safe Routing'],
          ['scenarios', 'What-If Scenarios'],
          ['community', 'Community Data'],
        ].map(([page, label]) => (
          <button
            key={page}
            type="button"
            onClick={() => onNavigate(page)}
            className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition ${activePage === page ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Center Search Bar (Section 27.1) */}
      <div className="relative w-64 md:w-72">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search landmark, ward or PIN..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchQuery.length > 1 && setShowDropdown(true)}
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {showDropdown && searchResults.length > 0 && (
          <div className="absolute top-9 left-0 right-0 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto">
            {searchResults.map((loc, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onSelectLandmark(loc.coords, loc.name);
                  setShowDropdown(false);
                  setSearchQuery(loc.name);
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800 border-b border-slate-800/60 last:border-none flex items-center justify-between transition"
              >
                <div>
                  <span className="font-bold text-white block">{loc.name}</span>
                  <span className="text-[10px] text-slate-400">{loc.address}</span>
                </div>
                <span className="text-[10px] text-cyan-400 font-mono">{loc.pin}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Section 27 Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Use My Location Button (27.1) */}
        <button
          onClick={onUseMyLocation}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
          title="Center Map on User GPS"
        >
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <span>My Location</span>
        </button>

        {/* Upload Custom Data Button (27.2) */}
        <button
          onClick={onOpenUploadModal}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
          title="Upload Municipal / Field GIS Data"
        >
          <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
          <span>Upload Data</span>
        </button>

        {/* Report Flood Button (27.3) */}
        <button
          onClick={onOpenReportModal}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-blue-600/30"
          title="Submit Live Flood Report"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Report Flood</span>
        </button>

        {/* Live Radar Badge */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="font-semibold text-red-400 uppercase tracking-wider text-[10px]">RADAR</span>
          <span className="text-slate-400 border-l border-slate-700 pl-1.5 text-[11px]">{lastUpdate}</span>
        </div>

        {/* Alerts Pill */}
        <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${
          activeAlertCount > 0 
            ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        }`}>
          {activeAlertCount > 0 ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{activeAlertCount} Alerts</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Normal</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

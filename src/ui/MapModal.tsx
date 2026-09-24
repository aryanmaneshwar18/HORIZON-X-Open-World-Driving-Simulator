import React, { useState } from 'react';
import { GAME_EVENTS } from '../data/events';
import { GameEvent, RegionId } from '../types/game';
import { GameEngine } from '../core/GameEngine';
import { MapPin, Navigation, Flag, Zap, Flame, ShieldAlert, Award, X, Compass, ExternalLink } from 'lucide-react';

interface MapModalProps {
  engine: GameEngine;
  onClose: () => void;
  onStartEvent: (event: GameEvent) => void;
}

export const MapModal: React.FC<MapModalProps> = ({ engine, onClose, onStartEvent }) => {
  const [selectedEvent, setSelectedEvent] = useState<GameEvent | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const pPos = engine.playerPhysics.state.position;
  const pRot = engine.playerPhysics.state.rotation.y;

  // Convert world coordinates [-1000, 1000] to map percentages [0%, 100%]
  const worldToMap = (x: number, z: number) => {
    const minCoord = -900;
    const maxCoord = 900;
    const pctX = ((x - minCoord) / (maxCoord - minCoord)) * 100;
    const pctY = ((z - minCoord) / (maxCoord - minCoord)) * 100;
    return { x: Math.max(5, Math.min(95, pctX)), y: Math.max(5, Math.min(95, pctY)) };
  };

  const playerMapPos = worldToMap(pPos.x, pPos.z);

  const filteredEvents = GAME_EVENTS.filter(evt => {
    if (filterType === 'all') return true;
    return evt.type === filterType;
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'circuit':
      case 'sprint':
        return <Flag className="w-4 h-4 text-orange-400" />;
      case 'speed_trap':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'drift_zone':
        return <Flame className="w-4 h-4 text-pink-400" />;
      case 'police_escape':
        return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case 'hill_climb':
      case 'rally':
        return <Navigation className="w-4 h-4 text-emerald-400" />;
      case 'championship':
        return <Award className="w-4 h-4 text-purple-400" />;
      default:
        return <MapPin className="w-4 h-4 text-white" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex flex-col font-rajdhani text-white select-none overflow-hidden">
      {/* 1. Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-black/50">
        <div className="flex items-center gap-3">
          <Compass className="w-6 h-6 text-cyan-400" />
          <h1 className="text-2xl font-black font-chakra italic tracking-wider uppercase text-white">
            WORLD MAP & EVENTS
          </h1>
        </div>

        {/* Filter Badges */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-900 border border-white/10 p-1 rounded-xl">
          {[
            { id: 'all', label: 'All' },
            { id: 'sprint', label: 'Sprints' },
            { id: 'circuit', label: 'Circuits' },
            { id: 'drift_zone', label: 'Drift' },
            { id: 'speed_trap', label: 'Speed Traps' },
            { id: 'police_escape', label: 'Police' },
            { id: 'championship', label: 'Championship' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold font-chakra uppercase transition-all cursor-pointer ${
                filterType === f.id ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Map Canvas Area */}
      <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
        {/* Stylized Vector Map Container */}
        <div className="relative w-full max-w-4xl aspect-square md:aspect-[4/3] bg-slate-950 rounded-2xl border-2 border-white/15 overflow-hidden shadow-2xl">
          {/* Biome Quadrants Background */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-40">
            {/* Top-Left: Mountain */}
            <div className="bg-slate-800 border-r border-b border-white/10 flex items-start p-4">
              <span className="text-xs font-black font-chakra tracking-widest text-slate-400 uppercase">
                AKINA MOUNTAIN RANGE
              </span>
            </div>
            {/* Top-Right: City */}
            <div className="bg-slate-900 border-b border-white/10 flex items-start justify-end p-4">
              <span className="text-xs font-black font-chakra tracking-widest text-cyan-400 uppercase">
                METRO CITY DOWNTOWN
              </span>
            </div>
            {/* Bottom-Left: Desert */}
            <div className="bg-amber-950/40 border-r border-white/10 flex items-end p-4">
              <span className="text-xs font-black font-chakra tracking-widest text-amber-500 uppercase">
                RED ROCK DESERT
              </span>
            </div>
            {/* Bottom-Right: Coast */}
            <div className="bg-blue-950/50 flex items-end justify-end p-4">
              <span className="text-xs font-black font-chakra tracking-widest text-sky-400 uppercase">
                PACIFIC COASTLINE
              </span>
            </div>
          </div>

          {/* Center Grand Ring Highway Line Overlay */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-orange-500/50 fill-none stroke-[3] stroke-dasharray-[8,4]">
            <rect x="18%" y="18%" width="64%" height="64%" rx="20%" />
            <line x1="50%" y1="18%" x2="50%" y2="82%" className="stroke-white/20 stroke-[2]" />
            <line x1="18%" y1="50%" x2="82%" y2="50%" className="stroke-white/20 stroke-[2]" />
          </svg>

          {/* Event Markers */}
          {filteredEvents.map(evt => {
            const pos = worldToMap(evt.position[0], evt.position[2]);
            const isCompleted = !!engine.progress.completedEvents[evt.id];
            const isSelected = selectedEvent?.id === evt.id;

            return (
              <button
                key={evt.id}
                onClick={() => setSelectedEvent(evt)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-full border-2 transition-all cursor-pointer shadow-lg group ${
                  isSelected
                    ? 'scale-125 border-white bg-orange-500 text-black z-20 ring-4 ring-orange-500/40'
                    : isCompleted
                    ? 'border-emerald-500 bg-slate-900 text-emerald-400 hover:scale-110 z-10'
                    : 'border-cyan-400 bg-slate-900 text-cyan-300 hover:scale-110 z-10'
                }`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                title={evt.title}
              >
                {getEventIcon(evt.type)}
              </button>
            );
          })}

          {/* Player Location Marker */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 flex items-center justify-center"
            style={{ left: `${playerMapPos.x}%`, top: `${playerMapPos.y}%` }}
          >
            <div className="w-5 h-5 rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_15px_#22d3ee] flex items-center justify-center animate-ping absolute" />
            <div
              className="w-4 h-4 rounded-full bg-cyan-400 border-2 border-white shadow-lg flex items-center justify-center relative"
              style={{ transform: `rotate(${-pRot}rad)` }}
            >
              <div className="w-1.5 h-1.5 bg-black rounded-full" />
              <div className="absolute -top-2 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-cyan-300" />
            </div>
          </div>
        </div>

        {/* Selected Event Bottom Floating Card */}
        {selectedEvent && (
          <div className="absolute bottom-6 max-w-lg w-full bg-slate-900/95 backdrop-blur-xl border border-white/20 p-5 rounded-2xl shadow-2xl flex flex-col gap-2 z-40 animate-fade-in">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-orange-400 font-chakra">
                  {selectedEvent.type.replace('_', ' ')} • {selectedEvent.region.toUpperCase()}
                </span>
                <h3 className="text-xl font-bold font-chakra text-white mt-0.5">
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              {selectedEvent.description}
            </p>

            <div className="flex items-center gap-4 text-xs font-bold text-amber-400 my-1">
              <span>PRIZE: +{selectedEvent.rewardCredits.toLocaleString()} CR</span>
              <span>•</span>
              <span>+{selectedEvent.rewardXP} XP</span>
              {selectedEvent.laps && <span>• {selectedEvent.laps} LAPS</span>}
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  engine.fastTravelTo(selectedEvent.position);
                  onClose();
                }}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 font-bold font-chakra text-xs uppercase rounded-xl cursor-pointer"
              >
                Fast Travel
              </button>
              <button
                onClick={() => {
                  engine.fastTravelTo(selectedEvent.position);
                  onStartEvent(selectedEvent);
                  onClose();
                }}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-black font-black font-chakra text-xs uppercase rounded-xl shadow-lg shadow-orange-500/30 cursor-pointer"
              >
                Start Race Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

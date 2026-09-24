import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './core/GameEngine';
import { HUD } from './ui/HUD';
import { GarageModal } from './ui/GarageModal';
import { MapModal } from './ui/MapModal';
import { PauseModal } from './ui/PauseModal';
import { RaceResultsModal } from './ui/RaceResultsModal';
import { DebugOverlay } from './ui/DebugOverlay';
import { GameEvent } from './types/game';
import { RaceResults } from './gameplay/RaceManager';
import { Play, Sparkles, Volume2, Shield } from 'lucide-react';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // UI state
  const [hasStarted, setHasStarted] = useState(false);
  const [, setTick] = useState(0);
  const [isGarageOpen, setIsGarageOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [activeRaceResults, setActiveRaceResults] = useState<RaceResults | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(containerRef.current);
    engineRef.current = engine;

    // Reactively update HUD
    engine.onStateUpdate(() => {
      setTick(t => (t + 1) % 10000);
    });

    engine.onRaceFinished((results) => {
      setActiveRaceResults(results);
    });

    // Global Key Listener for Modals
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPauseOpen(p => !p);
        setIsGarageOpen(false);
        setIsMapOpen(false);
      } else if (e.key === 'm' || e.key === 'M') {
        if (!isGarageOpen && !isPauseOpen) {
          setIsMapOpen(m => !m);
        }
      } else if (e.key === 'g' || e.key === 'G') {
        if (!isMapOpen && !isPauseOpen) {
          setIsGarageOpen(g => !g);
        }
      } else if (e.key === 'F1') {
        e.preventDefault();
        setIsDebugOpen(d => !d);
      } else if (e.key === 'Enter') {
        if (engine.nearbyEvent && !engine.raceManager.isRacing && !engine.raceManager.isStarting) {
          engine.launchEvent(engine.nearbyEvent);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      engine.destroy();
    };
  }, []);

  const handleStartGame = () => {
    if (engineRef.current) {
      engineRef.current.audio.resume();
    }
    setHasStarted(true);
  };

  const handleStartNearbyEvent = () => {
    if (engineRef.current && engineRef.current.nearbyEvent) {
      engineRef.current.launchEvent(engineRef.current.nearbyEvent);
    }
  };

  const handleStartMapEvent = (evt: GameEvent) => {
    if (engineRef.current) {
      engineRef.current.launchEvent(evt);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-rajdhani">
      {/* 1. 3D WebGL Canvas Viewport */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* 2. Welcome Splash Screen (First interaction triggers Audio Context) */}
      {!hasStarted && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-white text-center">
          <div className="max-w-xl flex flex-col items-center">
            {/* Title Badge */}
            <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 px-4 py-1.5 rounded-full text-xs font-bold text-orange-400 font-chakra uppercase tracking-widest mb-4">
              <Sparkles className="w-4 h-4" />
              <span>Next-Gen Browser Driving Simulator</span>
            </div>

            <h1 className="text-6xl md:text-7xl font-black font-chakra italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-400 to-amber-500 drop-shadow-[0_10px_20px_rgba(249,115,22,0.4)]">
              HORIZON X
            </h1>

            <p className="text-slate-300 text-sm md:text-base mt-3 max-w-md">
              Explore 4 open-world regions: Metro City, Akina Mountains, Red Rock Desert, and Pacific Coastline.
              Race, drift, evade the police, tune your dream fleet, and become the champion!
            </p>

            <button
              onClick={handleStartGame}
              className="mt-8 px-10 py-5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-black font-chakra text-xl uppercase tracking-wider rounded-2xl shadow-xl shadow-orange-500/30 flex items-center gap-3 cursor-pointer active:scale-95 transition-all"
            >
              <Play className="w-6 h-6 fill-current" />
              <span>ENTER THE HORIZON</span>
            </button>

            <div className="mt-8 flex items-center gap-6 text-xs text-slate-400 font-semibold">
              <span className="flex items-center gap-1.5"><Volume2 className="w-4 h-4 text-cyan-400" /> Web Audio Engine</span>
              <span>•</span>
              <span>10 Tunable Cars</span>
              <span>•</span>
              <span>Open World Freedom</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Real-Time In-Game HUD */}
      {hasStarted && engineRef.current && (
        <HUD
          engine={engineRef.current}
          onOpenMap={() => setIsMapOpen(true)}
          onOpenGarage={() => setIsGarageOpen(true)}
          onOpenPause={() => setIsPauseOpen(true)}
          onStartNearbyEvent={handleStartNearbyEvent}
        />
      )}

      {/* 4. Garage Modal */}
      {isGarageOpen && engineRef.current && (
        <GarageModal
          engine={engineRef.current}
          onClose={() => setIsGarageOpen(false)}
        />
      )}

      {/* 5. World Map Modal */}
      {isMapOpen && engineRef.current && (
        <MapModal
          engine={engineRef.current}
          onClose={() => setIsMapOpen(false)}
          onStartEvent={handleStartMapEvent}
        />
      )}

      {/* 6. Pause & Settings Menu */}
      {isPauseOpen && engineRef.current && (
        <PauseModal
          engine={engineRef.current}
          onResume={() => setIsPauseOpen(false)}
          onOpenGarage={() => {
            setIsPauseOpen(false);
            setIsGarageOpen(true);
          }}
          onOpenMap={() => {
            setIsPauseOpen(false);
            setIsMapOpen(true);
          }}
        />
      )}

      {/* 7. Race Results Celebration Modal */}
      {activeRaceResults && (
        <RaceResultsModal
          results={activeRaceResults}
          onContinue={() => setActiveRaceResults(null)}
        />
      )}

      {/* 8. F1 Debug Overlay */}
      {isDebugOpen && engineRef.current && (
        <DebugOverlay
          engine={engineRef.current}
          onClose={() => setIsDebugOpen(false)}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { GameEngine } from '../core/GameEngine';
import { SaveManager } from '../core/SaveManager';
import { Terminal, Zap, Shield, Cloud, Sun, DollarSign, X } from 'lucide-react';

interface DebugOverlayProps {
  engine: GameEngine;
  onClose: () => void;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ engine, onClose }) => {
  const [fps, setFps] = useState(60);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const currentFps = Math.round((frameCount * 1000) / (now - lastTime));
      setFps(currentFps);
      frameCount = 0;
      lastTime = now;
    }, 1000);

    const onFrame = () => {
      frameCount++;
      requestAnimationFrame(onFrame);
    };
    const req = requestAnimationFrame(onFrame);

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(req);
    };
  }, []);

  const pState = engine.playerPhysics.state;

  return (
    <div className="fixed top-4 left-4 z-50 bg-black/85 backdrop-blur-md border border-cyan-500/40 p-4 rounded-xl text-white font-mono text-xs max-w-sm w-full select-none shadow-2xl">
      <div className="flex justify-between items-center border-b border-cyan-500/30 pb-2 mb-2">
        <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
          <Terminal className="w-4 h-4" />
          <span>DEBUG TELEMETRY [F1]</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col gap-1 text-[11px] text-slate-300">
        <div className="flex justify-between">
          <span className="text-slate-400">FRAME RATE:</span>
          <span className={fps > 45 ? 'text-green-400 font-bold' : 'text-amber-400 font-bold'}>{fps} FPS</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">POSITION:</span>
          <span>{Math.round(pState.position.x)}, {Math.round(pState.position.y)}, {Math.round(pState.position.z)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">SPEED / RPM:</span>
          <span>{Math.round(pState.speedKmh)} km/h | {Math.round(pState.rpm * 8000)} RPM</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">GEAR / DRIFT:</span>
          <span>G:{pState.gear} | {pState.isDrifting ? `${Math.round(pState.driftAngleDeg)}° (x${pState.driftMultiplier})` : 'Grip'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">REGION / WEATHER:</span>
          <span className="uppercase text-amber-300">{engine.currentRegion} | {engine.weather.currentWeather}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">TRAFFIC / AI:</span>
          <span>{engine.traffic.cars.filter(c => c.active).length} Cars | {engine.aiController.opponents.length} Racers</span>
        </div>
      </div>

      {/* Cheats Row */}
      <div className="border-t border-white/10 mt-3 pt-2">
        <div className="text-[10px] text-slate-400 font-bold mb-1.5 uppercase">Dev Quick Actions</div>
        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          <button
            onClick={() => {
              engine.progress.credits += 100000;
              engine.audio.playCashSound();
              SaveManager.saveProgress(engine.progress);
            }}
            className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded flex items-center gap-1 cursor-pointer"
          >
            <DollarSign className="w-3 h-3" />
            +100K CR (F2)
          </button>

          <button
            onClick={() => {
              engine.progress.credits += 500000;
              engine.progress.level = 25;
              engine.progress.discoveredRegions = ['city', 'mountains', 'desert', 'coast'];
              engine.audio.playCashSound();
              SaveManager.saveProgress(engine.progress);
            }}
            className="p-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded flex items-center gap-1 cursor-pointer"
          >
            <Zap className="w-3 h-3" />
            Unlock All (F3)
          </button>

          <button
            onClick={() => {
              const weathers: ('clear' | 'rain' | 'fog' | 'storm')[] = ['clear', 'rain', 'fog', 'storm'];
              const curIdx = weathers.indexOf(engine.weather.currentWeather);
              engine.weather.setWeather(weathers[(curIdx + 1) % weathers.length]);
            }}
            className="p-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded flex items-center gap-1 cursor-pointer"
          >
            <Cloud className="w-3 h-3" />
            Cycle Weather (F5)
          </button>

          <button
            onClick={() => {
              engine.policeSystem.stopPursuit();
            }}
            className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded flex items-center gap-1 cursor-pointer"
          >
            <Shield className="w-3 h-3" />
            Clear Police
          </button>
        </div>
      </div>
    </div>
  );
};

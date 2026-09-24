import React from 'react';
import { GameEngine } from '../core/GameEngine';
import { SaveManager } from '../core/SaveManager';
import { Navigation, Zap, Flame, ShieldAlert, Award, Compass, Flag, MapPin, Gauge } from 'lucide-react';

interface HUDProps {
  engine: GameEngine;
  onOpenMap: () => void;
  onOpenGarage: () => void;
  onOpenPause: () => void;
  onStartNearbyEvent: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  engine,
  onOpenMap,
  onOpenGarage,
  onOpenPause,
  onStartNearbyEvent,
}) => {
  const pState = engine.playerPhysics?.state;
  if (!pState) return null;

  const speed = Math.round(pState.speedKmh);
  const rpm = pState.rpm;
  const gear = pState.gear === -1 ? 'R' : pState.gear === 0 ? 'N' : pState.gear.toString();
  const nitroPct = Math.round(pState.nitroLevel * 100);
  const isRacing = engine.raceManager.isRacing;
  const activeEvent = engine.raceManager.activeEvent;
  const countdownText = engine.countdownText;
  const nearbyEvent = engine.nearbyEvent;

  // Race position info
  let racePos = 1;
  let totalRacers = 1;
  if (isRacing && activeEvent) {
    const pInfo = engine.aiController.getRacePosition(engine.raceManager.playerDistanceTraveled, engine.raceManager.playerLap);
    racePos = pInfo.position;
    totalRacers = pInfo.totalRacers;
  }

  // Format race timer (MM:SS.ms)
  const raceSeconds = engine.raceManager.raceTimer;
  const mins = Math.floor(raceSeconds / 60);
  const secs = Math.floor(raceSeconds % 60);
  const ms = Math.floor((raceSeconds % 1) * 100);
  const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;

  // Region names display
  const regionNames = {
    city: 'METRO CITY',
    mountains: 'AKINA MOUNTAINS',
    desert: 'RED ROCK DESERT',
    coast: 'PACIFIC COAST',
  };

  // Checkpoint guidance
  const nextCpPos = engine.checkpointSystem.getCurrentCheckpointPos();
  let distToNextCp = 0;
  if (nextCpPos) {
    distToNextCp = Math.round(pState.position.distanceTo(nextCpPos));
  }

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-4 md:p-6 font-rajdhani text-white overflow-hidden">
      {/* 1. TOP HEADER BAR */}
      <div className="flex justify-between items-start w-full">
        {/* Left: Player Profile & Level */}
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-lg pointer-events-auto">
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center font-bold text-lg text-black font-chakra shadow-lg shadow-orange-500/30">
            {engine.progress.level}
          </div>
          <div>
            <div className="text-xs text-orange-400 font-semibold uppercase tracking-wider">
              {SaveManager.getTitleForLevel(engine.progress.level)}
            </div>
            <div className="text-lg font-bold font-chakra leading-tight text-white flex items-center gap-2">
              <span>{engine.progress.credits.toLocaleString()} CR</span>
            </div>
          </div>
        </div>

        {/* Center: Current Region / Race Header */}
        <div className="flex flex-col items-center">
          <div className="bg-black/70 backdrop-blur-md border border-white/15 px-5 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
            <Compass className="w-4 h-4 text-cyan-400 animate-spin-slow" />
            <span className="text-sm font-bold tracking-widest text-cyan-300 uppercase font-chakra">
              {regionNames[engine.currentRegion]}
            </span>
          </div>

          {/* Wanted Pursuit Bar if police active */}
          {engine.policeSystem.isPursuitActive && (
            <div className="mt-2 bg-red-950/80 border border-red-500/40 backdrop-blur-md px-4 py-1.5 rounded-lg flex items-center gap-3 animate-pulse">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-red-400 font-chakra">PURSUIT LEVEL {engine.policeSystem.wantedLevel}</span>
                <div className="w-32 h-1.5 bg-black/50 rounded-full overflow-hidden mt-0.5">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-100"
                    style={{ width: `${engine.policeSystem.evadeProgress * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-white/70">EVADE</span>
            </div>
          )}
        </div>

        {/* Right: Quick Menus & Camera button */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onOpenMap}
            className="bg-black/60 hover:bg-white/20 active:scale-95 transition-all backdrop-blur-md border border-white/15 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 uppercase font-chakra cursor-pointer"
          >
            <MapPin className="w-4 h-4 text-amber-400" />
            <span>Map (M)</span>
          </button>
          <button
            onClick={onOpenGarage}
            className="bg-black/60 hover:bg-white/20 active:scale-95 transition-all backdrop-blur-md border border-white/15 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 uppercase font-chakra cursor-pointer"
          >
            <Award className="w-4 h-4 text-cyan-400" />
            <span>Garage</span>
          </button>
          <button
            onClick={onOpenPause}
            className="bg-black/60 hover:bg-white/20 active:scale-95 transition-all backdrop-blur-md border border-white/15 px-3 py-2 rounded-lg text-xs font-bold uppercase font-chakra cursor-pointer"
          >
            ESC
          </button>
        </div>
      </div>

      {/* 2. MID SCREEN: COUNTDOWN / NEARBY EVENT / DRIFT SCORE */}
      <div className="flex flex-col items-center justify-center -mt-8">
        {/* Big Countdown Overlay */}
        {countdownText && (
          <div className="text-8xl md:text-9xl font-black font-chakra italic text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-orange-500 to-red-600 drop-shadow-[0_10px_25px_rgba(249,115,22,0.8)] animate-bounce">
            {countdownText}
          </div>
        )}

        {/* Drift Score Popup */}
        {pState.isDrifting && pState.driftScore > 0 && (
          <div className="flex flex-col items-center animate-fade-in">
            <div className="text-xs uppercase tracking-widest text-pink-400 font-bold flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-pink-500 animate-pulse" />
              <span>DRIFTING</span>
              <span className="bg-pink-500 text-black px-1.5 py-0.2 rounded font-black text-xs">
                x{pState.driftMultiplier}
              </span>
            </div>
            <div className="text-5xl md:text-6xl font-black font-chakra italic text-white drop-shadow-[0_0_20px_rgba(236,72,153,0.7)]">
              +{pState.driftScore.toLocaleString()}
            </div>
            <div className="flex items-center gap-4 text-sm text-white/80 font-bold mt-1">
              <span>{Math.round(pState.driftAngleDeg)}° ANGLE</span>
              <span className="text-pink-400">•</span>
              <span>{speed} KM/H</span>
            </div>
          </div>
        )}

        {/* Checkpoint guidance banner */}
        {isRacing && nextCpPos && (
          <div className="mt-4 bg-black/60 backdrop-blur-md border border-cyan-500/40 px-5 py-2 rounded-full flex items-center gap-3 shadow-lg">
            <Flag className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold font-chakra text-cyan-300">
              CHECKPOINT: {distToNextCp}m
            </span>
          </div>
        )}

        {/* Nearby Event Prompt in Free Roam */}
        {nearbyEvent && !isRacing && (
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-xl border-2 border-orange-500/60 p-5 rounded-2xl max-w-md w-full shadow-2xl flex flex-col items-center text-center animate-bounce-slight">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400 font-chakra">
              <Flag className="w-4 h-4" />
              <span>{nearbyEvent.type.replace('_', ' ')}</span>
            </div>
            <h3 className="text-2xl font-bold font-chakra text-white mt-1">
              {nearbyEvent.title}
            </h3>
            <p className="text-sm text-slate-300 mt-1 line-clamp-2">
              {nearbyEvent.description}
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs font-bold text-amber-400">
              <span>REWARD: +{nearbyEvent.rewardCredits.toLocaleString()} CR</span>
              <span>•</span>
              <span>+{nearbyEvent.rewardXP} XP</span>
            </div>
            <button
              onClick={onStartNearbyEvent}
              className="mt-4 w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-black font-chakra text-base py-3 px-6 rounded-xl uppercase tracking-wider shadow-lg shadow-orange-500/30 cursor-pointer active:scale-95 transition-all"
            >
              START EVENT (ENTER)
            </button>
          </div>
        )}
      </div>

      {/* 3. BOTTOM ROW: RACE STATS (LEFT) & TACHOMETER / SPEEDO (RIGHT) */}
      <div className="flex justify-between items-end w-full">
        {/* Left Side: Race Lap & Position Tracker */}
        {isRacing ? (
          <div className="bg-black/75 backdrop-blur-md border border-white/15 p-4 rounded-xl flex flex-col gap-1 min-w-[180px]">
            <div className="flex justify-between items-center text-xs text-slate-400 font-bold uppercase">
              <span>POSITION</span>
              <span className="text-2xl font-black font-chakra text-amber-400 leading-none">
                {racePos} / {totalRacers}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400 font-bold uppercase mt-1">
              <span>LAP</span>
              <span className="text-lg font-bold font-chakra text-white leading-none">
                {engine.raceManager.playerLap} / {engine.raceManager.totalLaps}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400 font-bold uppercase mt-1">
              <span>TIME</span>
              <span className="text-base font-bold font-chakra text-cyan-300 leading-none">
                {formattedTime}
              </span>
            </div>
          </div>
        ) : (
          /* Live Tactile WASD & Controls Visualizer */
          <div className="hidden md:flex flex-col gap-2 bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-xl">
            <div className="flex items-center gap-1.5 justify-center">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-black font-chakra text-sm border transition-all ${
                  engine.input.getInput().throttle > 0
                    ? 'bg-emerald-500 text-black border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.8)] scale-95'
                    : 'bg-white/10 text-white/80 border-white/15'
                }`}
              >
                W
              </div>
            </div>
            <div className="flex items-center gap-1.5 justify-center">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-black font-chakra text-sm border transition-all ${
                  engine.input.getInput().steer < 0
                    ? 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.8)] scale-95'
                    : 'bg-white/10 text-white/80 border-white/15'
                }`}
              >
                A
              </div>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-black font-chakra text-sm border transition-all ${
                  engine.input.getInput().brake > 0
                    ? 'bg-red-500 text-white border-red-300 shadow-[0_0_15px_rgba(239,68,68,0.8)] scale-95'
                    : 'bg-white/10 text-white/80 border-white/15'
                }`}
              >
                S
              </div>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-black font-chakra text-sm border transition-all ${
                  engine.input.getInput().steer > 0
                    ? 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.8)] scale-95'
                    : 'bg-white/10 text-white/80 border-white/15'
                }`}
              >
                D
              </div>
            </div>
            <div className="flex items-center gap-2 justify-center mt-0.5">
              <div
                className={`px-3 py-1 rounded-lg text-[10px] font-bold font-chakra uppercase border transition-all ${
                  engine.input.getInput().handbrake
                    ? 'bg-pink-500 text-black border-pink-300 shadow-[0_0_12px_rgba(236,72,153,0.8)]'
                    : 'bg-white/5 text-white/50 border-white/10'
                }`}
              >
                SPACE DRIFT
              </div>
              <div
                className={`px-2 py-1 rounded-lg text-[10px] font-bold font-chakra uppercase border transition-all ${
                  engine.input.getInput().nitro
                    ? 'bg-cyan-400 text-black border-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.8)]'
                    : 'bg-white/5 text-white/50 border-white/10'
                }`}
              >
                SHIFT
              </div>
            </div>
          </div>
        )}

        {/* Right Side: Speedometer & Tachometer Cluster */}
        <div className="flex flex-col items-end">
          {/* Nitro gauge bottle */}
          <div className="flex items-center gap-2 mb-2 bg-black/60 backdrop-blur-md border border-cyan-500/30 px-3 py-1.5 rounded-lg">
            <Zap className={`w-4 h-4 ${pState.isNitroActive ? 'text-cyan-300 animate-pulse' : 'text-cyan-500'}`} />
            <div className="flex flex-col items-end">
              <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">NITRO [SHIFT]</div>
              <div className="w-28 md:w-36 h-2 bg-black/60 rounded-full overflow-hidden border border-cyan-500/40 mt-0.5">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-75 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                  style={{ width: `${nitroPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Tachometer RPM arc & Speed display */}
          <div className="bg-black/80 backdrop-blur-xl border border-white/20 p-4 md:p-5 rounded-2xl flex items-center gap-5 shadow-2xl relative">
            {/* Gear Indicator */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GEAR</span>
              <span className={`text-4xl md:text-5xl font-black font-chakra ${gear === 'R' ? 'text-red-500' : 'text-amber-400'}`}>
                {gear}
              </span>
            </div>

            {/* Vertical Divider */}
            <div className="w-px h-14 bg-white/15" />

            {/* Speed Number & Unit */}
            <div className="flex flex-col items-end">
              <div className="flex items-baseline gap-1">
                <span className="text-6xl md:text-7xl font-black font-chakra italic tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                  {speed}
                </span>
                <span className="text-sm md:text-base font-bold text-orange-400 font-chakra uppercase">
                  KM/H
                </span>
              </div>

              {/* RPM Bar */}
              <div className="w-40 md:w-48 h-2 bg-slate-900 rounded-full overflow-hidden mt-1 border border-white/10 flex">
                <div
                  className={`h-full transition-all duration-75 ${
                    rpm > 0.88 ? 'bg-red-500 animate-pulse' : rpm > 0.7 ? 'bg-amber-400' : 'bg-cyan-400'
                  }`}
                  style={{ width: `${Math.round(rpm * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. MOBILE / TOUCH CONTROLS (Always available on touch devices) */}
      <div className="md:hidden pointer-events-auto flex justify-between items-end w-full pt-4">
        {/* Left: Steer Left & Right */}
        <div className="flex gap-2">
          <button
            onTouchStart={() => engine.input.setVirtualSteer(-1)}
            onTouchEnd={() => engine.input.setVirtualSteer(0)}
            className="w-16 h-16 bg-white/20 active:bg-orange-500 rounded-2xl flex items-center justify-center font-bold text-xl backdrop-blur-md border border-white/20"
          >
            ◀
          </button>
          <button
            onTouchStart={() => engine.input.setVirtualSteer(1)}
            onTouchEnd={() => engine.input.setVirtualSteer(0)}
            className="w-16 h-16 bg-white/20 active:bg-orange-500 rounded-2xl flex items-center justify-center font-bold text-xl backdrop-blur-md border border-white/20"
          >
            ▶
          </button>
        </div>

        {/* Right: Handbrake, Nitro, Brake, Gas */}
        <div className="flex gap-2 items-end">
          <button
            onTouchStart={() => engine.input.setVirtualHandbrake(true)}
            onTouchEnd={() => engine.input.setVirtualHandbrake(false)}
            className="w-12 h-12 bg-pink-600/40 active:bg-pink-500 rounded-xl flex items-center justify-center font-bold text-xs backdrop-blur-md border border-pink-400/40"
          >
            DRIFT
          </button>
          <button
            onTouchStart={() => engine.input.setVirtualNitro(true)}
            onTouchEnd={() => engine.input.setVirtualNitro(false)}
            className="w-12 h-12 bg-cyan-600/40 active:bg-cyan-500 rounded-xl flex items-center justify-center font-bold text-xs backdrop-blur-md border border-cyan-400/40"
          >
            NITRO
          </button>
          <button
            onTouchStart={() => engine.input.setVirtualBrake(1)}
            onTouchEnd={() => engine.input.setVirtualBrake(0)}
            className="w-14 h-16 bg-red-600/40 active:bg-red-500 rounded-2xl flex items-center justify-center font-bold text-sm backdrop-blur-md border border-red-400/40"
          >
            BRAKE
          </button>
          <button
            onTouchStart={() => engine.input.setVirtualThrottle(1)}
            onTouchEnd={() => engine.input.setVirtualThrottle(0)}
            className="w-14 h-20 bg-green-600/40 active:bg-green-500 rounded-2xl flex items-center justify-center font-bold text-sm backdrop-blur-md border border-green-400/40"
          >
            GAS
          </button>
        </div>
      </div>
    </div>
  );
};

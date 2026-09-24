import React from 'react';
import { GameEngine } from '../core/GameEngine';
import { SaveManager } from '../core/SaveManager';
import { Volume2, Monitor, Sun, CloudRain, RotateCcw, Play, Car, MapPin, X } from 'lucide-react';

interface PauseModalProps {
  engine: GameEngine;
  onResume: () => void;
  onOpenGarage: () => void;
  onOpenMap: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  engine,
  onResume,
  onOpenGarage,
  onOpenMap,
}) => {
  const [volume, setVolume] = React.useState(engine.settings.audioVolume);
  const [graphics, setGraphics] = React.useState(engine.settings.graphics);
  const [weather, setWeather] = React.useState(engine.weather.currentWeather);
  const [timeOfDay, setTimeOfDay] = React.useState(engine.dayNight.timeOfDay);

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    engine.settings.audioVolume = newVol;
    engine.audio.setVolume(newVol);
    SaveManager.saveSettings(engine.settings);
  };

  const handleGraphicsChange = (preset: 'low' | 'medium' | 'high') => {
    setGraphics(preset);
    engine.settings.graphics = preset;
    SaveManager.saveSettings(engine.settings);
    // Adjust shadow / pixel ratio
    engine.renderer.setPixelRatio(Math.min(window.devicePixelRatio, preset === 'high' ? 2 : 1.5));
    engine.renderer.shadowMap.enabled = preset !== 'low';
  };

  const handleWeatherChange = (w: 'clear' | 'rain' | 'fog' | 'storm') => {
    setWeather(w);
    engine.weather.setWeather(w);
  };

  const handleTimeChange = (t: 'dawn' | 'day' | 'sunset' | 'night') => {
    setTimeOfDay(t);
    engine.dayNight.setTimeOfDay(t);
  };

  const handleResetSave = () => {
    if (confirm('Are you sure you want to reset all game progress?')) {
      SaveManager.resetSave();
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 font-rajdhani text-white select-none">
      <div className="max-w-2xl w-full bg-slate-900 border border-white/20 rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <h2 className="text-3xl font-black font-chakra italic tracking-wider uppercase text-white">
            GAME PAUSED
          </h2>
          <button
            onClick={onResume}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Nav Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={onResume}
            className="py-3 bg-orange-500 hover:bg-orange-600 text-black font-black font-chakra rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Play className="w-4 h-4" />
            Resume
          </button>
          <button
            onClick={onOpenGarage}
            className="py-3 bg-white/10 hover:bg-white/20 font-bold font-chakra rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Car className="w-4 h-4 text-cyan-400" />
            Garage
          </button>
          <button
            onClick={onOpenMap}
            className="py-3 bg-white/10 hover:bg-white/20 font-bold font-chakra rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <MapPin className="w-4 h-4 text-amber-400" />
            Map
          </button>
        </div>

        {/* Settings Form */}
        <div className="flex flex-col gap-5">
          {/* Master Volume */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold font-chakra text-slate-300">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <span>MASTER AUDIO VOLUME</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-44 accent-orange-500 cursor-pointer"
            />
          </div>

          {/* Graphics Quality */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold font-chakra text-slate-300">
              <Monitor className="w-4 h-4 text-cyan-400" />
              <span>GRAPHICS PRESET</span>
            </div>
            <div className="flex gap-1.5">
              {(['low', 'medium', 'high'] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleGraphicsChange(preset)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold font-chakra uppercase transition-all cursor-pointer ${
                    graphics === preset ? 'bg-orange-500 text-black' : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Weather Override */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold font-chakra text-slate-300">
              <CloudRain className="w-4 h-4 text-cyan-400" />
              <span>WEATHER</span>
            </div>
            <div className="flex gap-1.5">
              {(['clear', 'rain', 'fog', 'storm'] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => handleWeatherChange(w)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold font-chakra uppercase transition-all cursor-pointer ${
                    weather === w ? 'bg-orange-500 text-black' : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {/* Time of Day */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold font-chakra text-slate-300">
              <Sun className="w-4 h-4 text-cyan-400" />
              <span>TIME OF DAY</span>
            </div>
            <div className="flex gap-1.5">
              {(['dawn', 'day', 'sunset', 'night'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleTimeChange(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold font-chakra uppercase transition-all cursor-pointer ${
                    timeOfDay === t ? 'bg-orange-500 text-black' : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Controls Reference */}
        <div className="border-t border-white/10 pt-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-chakra">
            Keyboard & Controls
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="bg-white/5 p-2 rounded-lg"><span className="text-orange-400 font-bold">W / ↑</span> Throttle</div>
            <div className="bg-white/5 p-2 rounded-lg"><span className="text-orange-400 font-bold">S / ↓</span> Brake / Rev</div>
            <div className="bg-white/5 p-2 rounded-lg"><span className="text-orange-400 font-bold">A, D / ←, →</span> Steer</div>
            <div className="bg-white/5 p-2 rounded-lg"><span className="text-orange-400 font-bold">SPACE</span> Handbrake</div>
            <div className="bg-white/5 p-2 rounded-lg"><span className="text-orange-400 font-bold">SHIFT</span> Nitro</div>
            <div className="bg-white/5 p-2 rounded-lg"><span className="text-orange-400 font-bold">C</span> Camera</div>
            <div className="bg-white/5 p-2 rounded-lg"><span className="text-orange-400 font-bold">R</span> Reset Car</div>
            <div className="bg-white/5 p-2 rounded-lg"><span className="text-orange-400 font-bold">M</span> World Map</div>
          </div>
        </div>

        {/* Reset Save Data */}
        <div className="flex justify-between items-center border-t border-white/10 pt-4">
          <span className="text-xs text-slate-500">HORIZON X • OPEN WORLD RACER</span>
          <button
            onClick={handleResetSave}
            className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Progress
          </button>
        </div>
      </div>
    </div>
  );
};

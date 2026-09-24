import React, { useState } from 'react';
import { CARS_DATABASE, UPGRADE_PRICES, DEFAULT_UPGRADES } from '../data/cars';
import { CarDefinition, CarUpgrades, CarCustomization } from '../types/game';
import { GameEngine } from '../core/GameEngine';
import { SaveManager } from '../core/SaveManager';
import { Check, ChevronLeft, ChevronRight, Wrench, Palette, Car, Sparkles, DollarSign, X } from 'lucide-react';

interface GarageModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({ engine, onClose }) => {
  const [selectedCarIndex, setSelectedCarIndex] = useState(() => {
    const idx = CARS_DATABASE.findIndex(c => c.id === engine.progress.currentCarId);
    return idx >= 0 ? idx : 0;
  });
  const [activeTab, setActiveTab] = useState<'showroom' | 'upgrades' | 'customize'>('showroom');

  const currentCar = CARS_DATABASE[selectedCarIndex];
  const isOwned = engine.progress.ownedCars.includes(currentCar.id);
  const isEquipped = engine.progress.currentCarId === currentCar.id;

  // Current upgrades & customization for this car
  const carUpgrades: CarUpgrades = engine.progress.carUpgrades[currentCar.id] || { ...DEFAULT_UPGRADES };
  const carCustom: CarCustomization = engine.progress.carCustomizations[currentCar.id] || {
    paintColor: currentCar.baseColor,
    finish: 'metallic',
    rimColor: '#1e293b',
    windowTint: '#0f172a',
    underglow: currentCar.baseColor,
    spoilerStyle: 'none',
    wheelStyle: 'sport',
  };

  // Color swatches
  const paintColors = [
    '#f97316', '#ef4444', '#06b6d4', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#eab308', '#ffffff', '#090d16'
  ];
  const neonColors = [
    '#06b6d4', '#f97316', '#ec4899', '#10b981', '#a855f7', '#eab308', '#ffffff'
  ];

  const handleSelectCar = () => {
    engine.progress.currentCarId = currentCar.id;
    SaveManager.saveProgress(engine.progress);
    engine.spawnPlayerCar(currentCar.id, engine.playerPhysics.state.position, engine.playerPhysics.state.rotation.y);
    engine.audio.playUiClick();
  };

  const handleBuyCar = () => {
    if (engine.progress.credits >= currentCar.price && !isOwned) {
      engine.progress.credits -= currentCar.price;
      engine.progress.ownedCars.push(currentCar.id);
      engine.progress.currentCarId = currentCar.id;
      SaveManager.saveProgress(engine.progress);
      engine.spawnPlayerCar(currentCar.id, engine.playerPhysics.state.position, engine.playerPhysics.state.rotation.y);
      engine.audio.playCashSound();
    }
  };

  const handleUpgradePart = (part: keyof typeof UPGRADE_PRICES) => {
    const curLevel = (carUpgrades[part as keyof CarUpgrades] as number) || 0;
    if (curLevel < 3) {
      const cost = UPGRADE_PRICES[part][curLevel];
      if (engine.progress.credits >= cost) {
        engine.progress.credits -= cost;
        const newUpgrades = { ...carUpgrades, [part]: curLevel + 1 };
        engine.progress.carUpgrades[currentCar.id] = newUpgrades;
        SaveManager.saveProgress(engine.progress);

        if (isEquipped) {
          engine.playerPhysics.updateCarConfig(currentCar, newUpgrades);
        }
        engine.audio.playCashSound();
      }
    }
  };

  const handleUpdateCustom = (updates: Partial<CarCustomization>) => {
    const newCustom = { ...carCustom, ...updates };
    engine.progress.carCustomizations[currentCar.id] = newCustom;
    SaveManager.saveProgress(engine.progress);

    if (isEquipped) {
      engine.playerRenderer.updateCustomization(newCustom);
    }
    engine.audio.playUiClick();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex flex-col font-rajdhani text-white select-none overflow-hidden">
      {/* 1. Header bar */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-black/50">
        <div className="flex items-center gap-3">
          <Car className="w-6 h-6 text-orange-400" />
          <h1 className="text-2xl font-black font-chakra italic tracking-wider uppercase text-white">
            HORIZON X GARAGE
          </h1>
          <span className="text-xs bg-white/10 px-2.5 py-1 rounded text-slate-300 font-semibold">
            {engine.progress.ownedCars.length} / {CARS_DATABASE.length} OWNED
          </span>
        </div>

        {/* Credits display & Close button */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-slate-900 border border-amber-500/30 px-4 py-1.5 rounded-lg">
            <DollarSign className="w-5 h-5 text-amber-400" />
            <span className="text-xl font-black font-chakra text-amber-300">
              {engine.progress.credits.toLocaleString()} CR
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Main Content Grid */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Column: Car Showcase / Carousel */}
        <div className="flex-1 flex flex-col justify-between p-6 md:p-8 bg-gradient-to-b from-transparent to-slate-950/60">
          {/* Car Header & Navigation */}
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-orange-400 uppercase tracking-widest font-chakra">
                {currentCar.category} CLASS
              </span>
              <h2 className="text-4xl md:text-5xl font-black font-chakra italic text-white uppercase mt-1">
                {currentCar.name}
              </h2>
              <p className="text-sm text-slate-400 max-w-lg mt-1">
                {currentCar.description}
              </p>
            </div>

            {/* Carousel Arrows */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedCarIndex(prev => (prev === 0 ? CARS_DATABASE.length - 1 : prev - 1))}
                className="w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-all active:scale-95"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => setSelectedCarIndex(prev => (prev === CARS_DATABASE.length - 1 ? 0 : prev + 1))}
                className="w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-all active:scale-95"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Central 3D Graphic Placeholder / Silhouette Accent */}
          <div className="my-auto flex flex-col items-center justify-center py-6">
            <div
              className="w-48 h-48 rounded-full border-4 border-dashed border-white/20 flex items-center justify-center relative shadow-2xl"
              style={{ backgroundColor: carCustom.paintColor + '20' }}
            >
              <Car className="w-28 h-28" style={{ color: carCustom.paintColor }} />
              {carCustom.underglow && (
                <div
                  className="absolute -bottom-4 w-40 h-4 rounded-full blur-md opacity-80"
                  style={{ backgroundColor: carCustom.underglow }}
                />
              )}
            </div>
            <div className="text-xs text-slate-400 font-semibold tracking-wider mt-3 uppercase">
              {currentCar.modelStyle.bodyShape} monocoque
            </div>
          </div>

          {/* Action Button: BUY or SELECT or TEST DRIVE */}
          <div className="flex items-center gap-4">
            {isOwned ? (
              isEquipped ? (
                <button
                  onClick={onClose}
                  className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-black font-black font-chakra text-lg uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/30 cursor-pointer active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  DRIVE NOW (EQUIPPED)
                </button>
              ) : (
                <button
                  onClick={handleSelectCar}
                  className="flex-1 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-black font-black font-chakra text-lg uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/30 cursor-pointer active:scale-98 transition-all"
                >
                  SELECT VEHICLE
                </button>
              )
            ) : (
              <button
                onClick={handleBuyCar}
                disabled={engine.progress.credits < currentCar.price}
                className={`flex-1 py-4 font-black font-chakra text-lg uppercase tracking-wider rounded-xl shadow-lg cursor-pointer active:scale-98 transition-all ${
                  engine.progress.credits >= currentCar.price
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black hover:from-orange-600 hover:to-amber-600 shadow-orange-500/30'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/10'
                }`}
              >
                BUY FOR {currentCar.price.toLocaleString()} CR
              </button>
            )}

            <button
              onClick={onClose}
              className="px-6 py-4 bg-white/10 hover:bg-white/20 font-bold font-chakra text-base uppercase rounded-xl cursor-pointer"
            >
              TEST DRIVE
            </button>
          </div>
        </div>

        {/* Right Column: Performance Stats & Tuning Tabs */}
        <div className="w-full md:w-[480px] border-l border-white/10 bg-slate-950/80 backdrop-blur-xl flex flex-col p-6 overflow-y-auto">
          {/* Sub-Tabs: SHOWROOM / UPGRADES / CUSTOMIZE */}
          <div className="flex border-b border-white/10 pb-4 gap-2">
            <button
              onClick={() => setActiveTab('showroom')}
              className={`flex-1 py-2 rounded-lg font-bold font-chakra text-xs uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'showroom' ? 'bg-orange-500 text-black' : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <Car className="w-4 h-4" />
              Specs
            </button>
            <button
              onClick={() => setActiveTab('upgrades')}
              className={`flex-1 py-2 rounded-lg font-bold font-chakra text-xs uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'upgrades' ? 'bg-orange-500 text-black' : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <Wrench className="w-4 h-4" />
              Upgrades
            </button>
            <button
              onClick={() => setActiveTab('customize')}
              className={`flex-1 py-2 rounded-lg font-bold font-chakra text-xs uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'customize' ? 'bg-orange-500 text-black' : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <Palette className="w-4 h-4" />
              Custom
            </button>
          </div>

          {/* TAB 1: VEHICLE SPECIFICATIONS */}
          {activeTab === 'showroom' && (
            <div className="flex flex-col gap-4 mt-4">
              <h3 className="text-sm font-bold text-slate-300 font-chakra uppercase tracking-wider">
                Vehicle Telemetry
              </h3>

              {/* Stat Bar Helper */}
              {[
                { label: 'POWER', val: currentCar.stats.power, max: 10, unit: '/ 10' },
                { label: 'TOP SPEED', val: currentCar.stats.topSpeed, max: 400, unit: 'KM/H' },
                { label: 'ACCELERATION', val: (10 - currentCar.stats.acceleration), max: 10, unit: `${currentCar.stats.acceleration}s (0-100)` },
                { label: 'GRIP & TRACTION', val: currentCar.stats.grip, max: 10, unit: '/ 10' },
                { label: 'BRAKING', val: currentCar.stats.braking, max: 10, unit: '/ 10' },
                { label: 'DRIFT POTENTIAL', val: currentCar.stats.drift, max: 10, unit: '/ 10' },
              ].map(stat => (
                <div key={stat.label} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-bold text-slate-400">
                    <span>{stat.label}</span>
                    <span className="text-white font-chakra">{stat.unit}</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300"
                      style={{ width: `${Math.min(100, (stat.val / stat.max) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10 text-xs">
                <div className="bg-white/5 p-3 rounded-lg">
                  <div className="text-slate-400 font-bold">CURB WEIGHT</div>
                  <div className="text-lg font-black font-chakra text-white mt-0.5">{currentCar.stats.weight} KG</div>
                </div>
                <div className="bg-white/5 p-3 rounded-lg">
                  <div className="text-slate-400 font-bold">DRIVETRAIN</div>
                  <div className="text-lg font-black font-chakra text-orange-400 mt-0.5">{carUpgrades.drivetrain}</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERFORMANCE UPGRADES */}
          {activeTab === 'upgrades' && (
            <div className="flex flex-col gap-3 mt-4">
              <h3 className="text-sm font-bold text-slate-300 font-chakra uppercase tracking-wider">
                Performance Parts (Stage 1 to 3)
              </h3>

              {(['engine', 'turbo', 'transmission', 'brakes', 'suspension', 'tires', 'weightReduction'] as const).map(part => {
                const lvl = carUpgrades[part] || 0;
                const nextCost = lvl < 3 ? UPGRADE_PRICES[part][lvl] : 0;
                const canAfford = engine.progress.credits >= nextCost;

                return (
                  <div key={part} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                    <div>
                      <div className="text-sm font-bold font-chakra uppercase text-white">
                        {part.replace(/([A-Z])/g, ' $1')}
                      </div>
                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3].map(step => (
                          <div
                            key={step}
                            className={`w-6 h-1.5 rounded-full ${step <= lvl ? 'bg-orange-500' : 'bg-slate-800'}`}
                          />
                        ))}
                      </div>
                    </div>

                    {lvl >= 3 ? (
                      <span className="text-xs font-bold text-emerald-400 font-chakra bg-emerald-500/10 px-2.5 py-1 rounded">
                        MAX STAGE
                      </span>
                    ) : (
                      <button
                        onClick={() => handleUpgradePart(part)}
                        disabled={!canAfford}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black font-chakra cursor-pointer transition-all ${
                          canAfford
                            ? 'bg-amber-500 text-black hover:bg-amber-400'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        UPGRADE ${nextCost.toLocaleString()}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: VISUAL CUSTOMIZATION */}
          {activeTab === 'customize' && (
            <div className="flex flex-col gap-4 mt-4">
              {/* Paint Color */}
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-chakra">
                  Chassis Paint Color
                </span>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {paintColors.map(color => (
                    <button
                      key={color}
                      onClick={() => handleUpdateCustom({ paintColor: color })}
                      className={`w-full h-8 rounded-lg border-2 transition-all cursor-pointer ${
                        carCustom.paintColor === color ? 'border-white scale-105' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Paint Finish */}
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-chakra">
                  Paint Finish
                </span>
                <div className="flex gap-2 mt-2">
                  {(['gloss', 'metallic', 'matte'] as const).map(finish => (
                    <button
                      key={finish}
                      onClick={() => handleUpdateCustom({ finish })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-chakra uppercase transition-all cursor-pointer ${
                        carCustom.finish === finish ? 'bg-orange-500 text-black' : 'bg-white/10 text-white'
                      }`}
                    >
                      {finish}
                    </button>
                  ))}
                </div>
              </div>

              {/* Spoiler Style */}
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-chakra">
                  Aerodynamic Spoiler
                </span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(['none', 'ducktail', 'gt_wing', 'carbon_race'] as const).map(spoiler => (
                    <button
                      key={spoiler}
                      onClick={() => handleUpdateCustom({ spoilerStyle: spoiler })}
                      className={`py-2 rounded-lg text-xs font-bold font-chakra uppercase transition-all cursor-pointer ${
                        carCustom.spoilerStyle === spoiler ? 'bg-orange-500 text-black' : 'bg-white/10 text-white'
                      }`}
                    >
                      {spoiler.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Neon Underglow */}
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-chakra">
                  Neon Underglow
                </span>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  <button
                    onClick={() => handleUpdateCustom({ underglow: null })}
                    className={`py-2 rounded-lg text-xs font-bold font-chakra uppercase cursor-pointer ${
                      carCustom.underglow === null ? 'bg-orange-500 text-black' : 'bg-white/10 text-white'
                    }`}
                  >
                    Off
                  </button>
                  {neonColors.slice(0, 3).map(color => (
                    <button
                      key={color}
                      onClick={() => handleUpdateCustom({ underglow: color })}
                      className={`h-8 rounded-lg border-2 transition-all cursor-pointer ${
                        carCustom.underglow === color ? 'border-white scale-105' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

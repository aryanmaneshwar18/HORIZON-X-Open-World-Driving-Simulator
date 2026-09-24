import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RaceResults } from '../gameplay/RaceManager';
import { Award, Trophy, DollarSign, Zap, Clock, ArrowRight } from 'lucide-react';

interface RaceResultsModalProps {
  results: RaceResults;
  onContinue: () => void;
}

export const RaceResultsModal: React.FC<RaceResultsModalProps> = ({ results, onContinue }) => {
  useEffect(() => {
    if (results.position === 1) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [results.position]);

  const isWin = results.position === 1;

  // Format time (MM:SS.ms)
  const mins = Math.floor(results.time / 60);
  const secs = Math.floor(results.time % 60);
  const ms = Math.floor((results.time % 1) * 100);
  const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 font-rajdhani text-white select-none">
      <div className="max-w-lg w-full bg-slate-900 border-2 border-orange-500/50 rounded-2xl p-6 md:p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden animate-fade-in">
        {/* Glowing Ambient Backdrop */}
        <div className="absolute -top-24 w-72 h-72 rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />

        {/* Podium Icon */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/40 text-black mb-4">
          {isWin ? <Trophy className="w-10 h-10" /> : <Award className="w-10 h-10" />}
        </div>

        <span className="text-xs font-bold text-orange-400 uppercase tracking-widest font-chakra">
          {results.event.type.replace('_', ' ')} COMPLETE
        </span>
        <h2 className="text-3xl md:text-4xl font-black font-chakra italic uppercase text-white mt-1">
          {results.event.title}
        </h2>

        {/* Position / Finish Status */}
        <div className="my-5 flex items-baseline gap-2">
          <span className="text-6xl md:text-7xl font-black font-chakra italic text-amber-400">
            {results.position === 1 ? '1ST' : results.position === 2 ? '2ND' : results.position === 3 ? '3RD' : `${results.position}TH`}
          </span>
          {results.totalRacers > 1 && (
            <span className="text-xl font-bold text-slate-400 font-chakra">
              / {results.totalRacers}
            </span>
          )}
        </div>

        {/* Telemetry Stats Grid */}
        <div className="w-full grid grid-cols-2 gap-3 mb-6 text-left">
          <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center gap-3">
            <Clock className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">RACE TIME</div>
              <div className="text-base font-bold font-chakra text-white">{formattedTime}</div>
            </div>
          </div>

          {results.speed ? (
            <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center gap-3">
              <Zap className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">RECORD SPEED</div>
                <div className="text-base font-bold font-chakra text-white">{results.speed} KM/H</div>
              </div>
            </div>
          ) : results.score ? (
            <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center gap-3">
              <Zap className="w-5 h-5 text-pink-400" />
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">DRIFT SCORE</div>
                <div className="text-base font-bold font-chakra text-white">{results.score.toLocaleString()}</div>
              </div>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center gap-3">
              <Award className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">STATUS</div>
                <div className="text-base font-bold font-chakra text-white">QUALIFIED</div>
              </div>
            </div>
          )}
        </div>

        {/* Rewards Section */}
        <div className="w-full bg-slate-950 border border-amber-500/20 rounded-xl p-4 flex justify-around items-center mb-6">
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase">CREDITS EARNED</span>
            <span className="text-2xl font-black font-chakra text-amber-300">
              +{results.creditsEarned.toLocaleString()} CR
            </span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase">XP GAINED</span>
            <span className="text-2xl font-black font-chakra text-cyan-400">
              +{results.xpEarned.toLocaleString()} XP
            </span>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={onContinue}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-black font-chakra text-base uppercase tracking-wider rounded-xl shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
        >
          <span>CONTINUE TO OPEN WORLD</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

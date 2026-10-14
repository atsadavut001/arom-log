import React, { useState, useRef } from 'react';
import { playWarmChime, playResonantChime, playPeacefulHarmony } from '../utils/audio.ts';
import { MiniGameRoundRecord } from '../types.ts';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  ArrowRight,
  Flame,
  CheckCircle2,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

interface SmileFinderGameProps {
  onComplete?: (badgeId?: string) => void;
  onBackToHub?: () => void;
  onSwitchToVentGame?: () => void;
}

export const SmileFinderGame: React.FC<SmileFinderGameProps> = ({
  onComplete,
  onBackToHub,
  onSwitchToVentGame,
}) => {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'completed'>('intro');
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [totalPlannedRounds, setTotalPlannedRounds] = useState<number>(26);
  const [gridSize, setGridSize] = useState<number>(3); // 3, 4, or 5
  const [targetIndex, setTargetIndex] = useState<number>(0);
  const [records, setRecords] = useState<MiniGameRoundRecord[]>([]);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [isCorrectClicked, setIsCorrectClicked] = useState<boolean>(false);
  const [warmthLevel, setWarmthLevel] = useState<number>(0);

  // Timers and adaptive calculation
  const roundStartTimeRef = useRef<number>(0);
  const adaptiveExtendedRef = useRef<boolean>(false);

  // Frowning emojis variations
  const FROWNING_EMOJIS = ['🙁', '☹️', '😞', '😔', '😕', '😟'];

  // Start new Smile game
  const startGame = () => {
    setGameState('playing');
    setCurrentRound(1);
    setTotalPlannedRounds(26);
    setRecords([]);
    adaptiveExtendedRef.current = false;
    setupRound(1, 3);
  };

  // Setup specific round and grid
  const setupRound = (round: number, size: number) => {
    setGridSize(size);
    const totalCells = size * size;
    const newTarget = Math.floor(Math.random() * totalCells);
    setTargetIndex(newTarget);
    setLastClickedIndex(null);
    setIsCorrectClicked(false);

    if (size === 4) setWarmthLevel(6);
    else if (size === 5) setWarmthLevel(10);
    else setWarmthLevel(0);

    roundStartTimeRef.current = performance.now();
  };

  const handleCellClick = (index: number) => {
    if (isCorrectClicked) return;
    setLastClickedIndex(index);

    if (index === targetIndex) {
      const clickTime = performance.now();
      const reactionTime = Math.round(clickTime - roundStartTimeRef.current);
      setIsCorrectClicked(true);

      const setIndex: 1 | 2 | 3 = gridSize === 3 ? 1 : gridSize === 4 ? 2 : 3;

      const newRecord: MiniGameRoundRecord = {
        round: currentRound,
        setIndex,
        gridSize,
        reactionTimeMs: reactionTime,
        timestamp: Date.now(),
      };
      const updatedRecords = [...records, newRecord];
      setRecords(updatedRecords);

      // Sound feedback
      if (gridSize === 3 && currentRound === 8) {
        playResonantChime();
      } else {
        playWarmChime();
      }

      // Progressive chunking
      let nextRound = currentRound + 1;
      let nextSize = gridSize;

      if (nextRound <= 8) {
        nextSize = 3;
      } else if (nextRound <= 18) {
        nextSize = 4;
      } else {
        nextSize = 5;
      }

      // Adaptive check: check after round 18
      if (currentRound === 18 && !adaptiveExtendedRef.current) {
        const set2Records = updatedRecords.filter((r) => r.setIndex === 2);
        if (set2Records.length >= 6) {
          const times = set2Records.map((r) => r.reactionTimeMs);
          const maxTime = Math.max(...times);
          const minTime = Math.min(...times);
          if (maxTime - minTime > 3000) {
            adaptiveExtendedRef.current = true;
            setTotalPlannedRounds((prev) => prev + 4);
          }
        }
      }

      // Check calm and focused pattern
      if (nextRound > 20 && updatedRecords.length >= 6) {
        const last6 = updatedRecords.slice(-6);
        const allUnderThreshold = last6.every(
          (r) => r.reactionTimeMs <= 2500 && r.reactionTimeMs >= 700
        );
        const last6Times = last6.map((r) => r.reactionTimeMs);
        const variance = Math.max(...last6Times) - Math.min(...last6Times);

        if (allUnderThreshold && variance < 1400) {
          setTimeout(() => {
            finishSmileGame();
          }, 450);
          return;
        }
      }

      if (currentRound >= totalPlannedRounds) {
        setTimeout(() => {
          finishSmileGame();
        }, 450);
        return;
      }

      setTimeout(() => {
        setCurrentRound(nextRound);
        setupRound(nextRound, nextSize);
      }, 350);
    }
  };

  const finishSmileGame = () => {
    setGameState('completed');
    playPeacefulHarmony();
    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#10B981', '#F472B6', '#60A5FA'],
      });
    } catch {}

    if (onComplete) {
      onComplete('mindful_peace');
    }
  };

  const avgReactionTime =
    records.length > 0
      ? Math.round(records.reduce((sum, r) => sum + r.reactionTimeMs, 0) / records.length)
      : 0;

  return (
    <div className="max-w-md mx-auto w-full">
      {/* 1. INTRO STATE */}
      {gameState === 'intro' && (
        <div className="text-center py-6 sm:py-8 space-y-6 bg-white/90 rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-md">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-amber-100/90 border-2 border-amber-300 flex items-center justify-center shadow-inner text-5xl animate-bounce">
            😊
          </div>
          <div>
            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 font-bold text-xs rounded-full mb-2">
              ตามหาฉันสิ ✨
            </span>
            <h4 className="text-2xl font-black text-gray-900">
              ค้นหาใบหน้ายิ้ม
            </h4>
            <p className="text-xs sm:text-sm text-gray-600 mt-2 max-w-sm mx-auto leading-relaxed">
              ช่วยดึงความสนใจกลับมายังปัจจุบันและปรับสมดุลสมาธิอย่างนุ่มนวล
            </p>
          </div>

          <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/70 text-left text-xs text-gray-700 space-y-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-900">1. วอร์มอัพ 3x3:</span>
              <span>ดึงสมาธิอย่างง่ายและรวดเร็ว</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-900">2. โฟกัส 4x4:</span>
              <span>ฝึกตัดสิ่งรบกวนรอบตัว</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-900">3. โฟลว์ 5x5:</span>
              <span>ปล่อยวางความคิดลบ</span>
            </div>
          </div>

          <button
            type="button"
            onClick={startGame}
            className="w-full py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-black text-sm sm:text-base shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
          >
            <span>เริ่มเกมฝึกสมาธิ</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. PLAYING STATE */}
      {gameState === 'playing' && (
        <div className="bg-white/95 rounded-3xl p-5 sm:p-8 border border-amber-200/80 shadow-md space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-600 font-semibold">
              <span className="px-2.5 py-1 rounded-full bg-amber-100/80 text-amber-900 font-bold">
                {gridSize === 3
                  ? 'เซต 1: วอร์มอัพ (3x3)'
                  : gridSize === 4
                  ? 'เซต 2: โฟกัส (4x4)'
                  : 'เซต 3: โฟลว์ (5x5)'}
              </span>
              <span className="font-mono text-gray-500">
                รอบที่ {currentRound} / {totalPlannedRounds}
              </span>
            </div>
            <div className="w-full bg-amber-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300 rounded-full"
                style={{
                  width: `${Math.min(100, (currentRound / totalPlannedRounds) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Grid */}
          <div
            className="grid gap-2 sm:gap-3 mx-auto transition-all duration-500 max-w-[340px]"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: gridSize * gridSize }).map((_, index) => {
              const isTarget = index === targetIndex;
              const isClicked = lastClickedIndex === index;
              const emoji = isTarget
                ? '😊'
                : FROWNING_EMOJIS[(index + currentRound) % FROWNING_EMOJIS.length];

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleCellClick(index)}
                  className={`aspect-square rounded-2xl border-2 flex items-center justify-center transition-all duration-150 cursor-pointer select-none active:scale-95 ${
                    isClicked && isTarget
                      ? 'bg-amber-300 border-amber-500 scale-110 shadow-lg ring-4 ring-amber-200'
                      : isClicked && !isTarget
                      ? 'bg-gray-200 border-gray-400 shake'
                      : 'bg-white/90 border-amber-100 hover:border-amber-300 hover:bg-amber-50/70 shadow-2xs'
                  }`}
                  style={{
                    fontSize: gridSize === 3 ? '2.3rem' : gridSize === 4 ? '1.8rem' : '1.4rem',
                  }}
                >
                  <span className={isClicked && isTarget ? 'animate-bounce' : ''}>
                    {emoji}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-center text-xs text-amber-900/70 font-medium">
            "แตะที่ใบหน้ายิ้ม 😊 ให้เร็วที่สุด"
          </p>
        </div>
      )}

      {/* 3. COMPLETED STATE */}
      {gameState === 'completed' && (
        <div className="text-center py-6 sm:py-8 space-y-6 bg-white/95 rounded-3xl p-6 sm:p-8 border border-emerald-200 shadow-md animate-in fade-in">
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-200/50 animate-ping" />
            <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center text-4xl shadow-lg relative z-10">
              🌿
            </div>
          </div>

          <div>
            <h4 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug">
              "ขอบคุณที่ให้เวลาตัวเองได้พักนะ<br />หายใจเข้าลึกๆ..."
            </h4>
            <p className="text-xs sm:text-sm text-gray-600 mt-2 max-w-sm mx-auto leading-relaxed">
              คุณได้ฝึกสมองให้หันเหออกจากความคิดด้านลบและเพิ่มสมาธิอย่างยอดเยี่ยม
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80 text-xs">
            <div className="text-left">
              <span className="text-gray-500 block">รอบที่ฝึกสำเร็จ</span>
              <span className="text-xl font-black text-gray-900">{records.length} รอบ</span>
            </div>
            <div className="text-left">
              <span className="text-gray-500 block">เวลาตอบสนองเฉลี่ย</span>
              <span className="text-xl font-black text-emerald-600">
                {(avgReactionTime / 1000).toFixed(2)} วินาที
              </span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-left">
            <span className="text-3xl">🧘</span>
            <div>
              <h5 className="font-bold text-amber-900 text-xs sm:text-sm">
                ปลดล็อคตรา: ผู้ฝึกจิตใจนิ่ง (Mindful Peace)
              </h5>
              <p className="text-[11px] text-amber-700">
                ฝึกมองหาความสดใสและสร้างสมาธิ
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={startGame}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>เล่นอีกครั้ง</span>
            </button>
            {onBackToHub && (
              <button
                type="button"
                onClick={onBackToHub}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>กลับสู่หน้ารวมเกม</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

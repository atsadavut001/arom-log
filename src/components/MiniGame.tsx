import React, { useState, useEffect, useRef } from 'react';
import { playWarmChime, playResonantChime, playPeacefulHarmony } from '../utils/audio.ts';
import { MiniGameRoundRecord } from '../types.ts';
import { VentAndDestroyGame } from './VentAndDestroyGame.tsx';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Heart,
  RotateCcw,
  CheckCircle2,
  Smile,
  Frown,
  Activity,
  ArrowRight,
  Flame,
  X
} from 'lucide-react';

interface MiniGameProps {
  initialGame?: 'smile' | 'vent';
  onClose: () => void;
  onGameComplete?: (badgeId?: string) => void;
}

export const MiniGame: React.FC<MiniGameProps> = ({
  initialGame = 'vent',
  onClose,
  onGameComplete
}) => {
  const [activeGameTab, setActiveGameTab] = useState<'smile' | 'vent'>(initialGame);

  // --- SMILE FINDER GAME STATE ---
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'completed'>('intro');
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [totalPlannedRounds, setTotalPlannedRounds] = useState<number>(26);
  const [gridSize, setGridSize] = useState<number>(3); // 3, 4, or 5
  const [targetIndex, setTargetIndex] = useState<number>(0);
  const [records, setRecords] = useState<MiniGameRoundRecord[]>([]);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [isCorrectClicked, setIsCorrectClicked] = useState<boolean>(false);
  const [warmthLevel, setWarmthLevel] = useState<number>(0); // 0 to 10 for background shift

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

    // Warmth background level in Set 2 and Set 3
    if (size === 4) setWarmthLevel(6);
    else if (size === 5) setWarmthLevel(10);
    else setWarmthLevel(0);

    roundStartTimeRef.current = performance.now();
  };

  const handleCellClick = (index: number) => {
    if (isCorrectClicked) return; // Prevent double taps during animation
    setLastClickedIndex(index);

    if (index === targetIndex) {
      // Correct smiling face found!
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
        // Last of Set 1: Special resonant harmonic chime
        playResonantChime();
      } else {
        // Normal warm chime
        playWarmChime();
      }

      // Check adaptive conditions
      let nextRound = currentRound + 1;
      let nextSize = gridSize;

      // Progressive chunking:
      // Rounds 1-8: 3x3 (Set 1)
      // Rounds 9-18: 4x4 (Set 2)
      // Rounds 19-26+: 5x5 (Set 3)
      if (nextRound <= 8) {
        nextSize = 3;
      } else if (nextRound <= 18) {
        nextSize = 4;
      } else {
        nextSize = 5;
      }

      // Adaptive check:
      // Check after round 18 if reaction times were wildly fluctuating
      if (currentRound === 18 && !adaptiveExtendedRef.current) {
        const set2Records = updatedRecords.filter((r) => r.setIndex === 2);
        if (set2Records.length >= 6) {
          const times = set2Records.map((r) => r.reactionTimeMs);
          const maxTime = Math.max(...times);
          const minTime = Math.min(...times);
          // If swing is > 3000ms, user may still be tense/distracted -> extend set 2 by 4 rounds
          if (maxTime - minTime > 3000) {
            adaptiveExtendedRef.current = true;
            setTotalPlannedRounds((prev) => prev + 4);
          }
        }
      }

      // Check calm and focused pattern:
      // In set 3, if user played >= 20 rounds, and last 6 rounds were consistent
      if (nextRound > 20 && updatedRecords.length >= 6) {
        const last6 = updatedRecords.slice(-6);
        const allUnderThreshold = last6.every(
          (r) => r.reactionTimeMs <= 2500 && r.reactionTimeMs >= 700
        );
        const last6Times = last6.map((r) => r.reactionTimeMs);
        const variance = Math.max(...last6Times) - Math.min(...last6Times);

        if (allUnderThreshold && variance < 1400) {
          // Mind is calm and focused! Early completion with encouragement
          setTimeout(() => {
            finishSmileGame();
          }, 450);
          return;
        }
      }

      if (currentRound >= totalPlannedRounds) {
        // Game complete
        setTimeout(() => {
          finishSmileGame();
        }, 450);
        return;
      }

      // Next round after short smooth transition
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
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#10B981', '#F472B6', '#60A5FA'],
      });
    } catch {}

    if (onGameComplete) {
      onGameComplete('mindful_peace');
    }
  };

  // Calculate statistics for completed screen
  const avgReactionTime =
    records.length > 0
      ? Math.round(records.reduce((sum, r) => sum + r.reactionTimeMs, 0) / records.length)
      : 0;

  // Background tint style based on active tab and warmthLevel
  const bgWarmthStyles =
    activeGameTab === 'vent'
      ? 'bg-amber-50/70 border-amber-200/90'
      : warmthLevel >= 10
      ? 'bg-amber-50/90 border-amber-200/80'
      : warmthLevel >= 6
      ? 'bg-orange-50/70 border-orange-200/80'
      : 'bg-stone-50/90 border-amber-200/80';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-h-[85dvh] sm:max-h-[88vh] my-auto rounded-2xl sm:rounded-3xl shadow-2xl border transition-all duration-500 flex flex-col overflow-hidden ${
          activeGameTab === 'vent' ? 'max-w-lg' : 'max-w-md'
        } ${bgWarmthStyles}`}
      >
        {/* Sticky Top Header */}
        <div className="shrink-0 p-3 sm:p-5 pb-2.5 border-b border-amber-200/60 bg-white/70 backdrop-blur-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">
                {activeGameTab === 'vent' ? '🌪️' : '🧘'}
              </span>
              <div>
                <h3 className="font-extrabold text-gray-900 text-sm sm:text-base leading-tight">
                  {activeGameTab === 'vent'
                    ? 'เขียนแล้วบดขยี้ทิ้ง'
                    : 'ตามหาใบหน้ายิ้ม'}
                </h3>
                <p className="text-[11px] text-amber-800">
                  {activeGameTab === 'vent'
                    ? 'พิมพ์ระบายความหงุดหงิด แล้วบดหรือเผาทำลายทิ้ง'
                    : 'ฝึกดึงสมาธิและปรับสมดุลความคิด'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-black/5 transition cursor-pointer touch-manipulation"
              title="ปิดหน้าต่าง"
              aria-label="ปิดหน้าต่างเกม"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Game Switcher Tabs */}
          <div className="flex bg-gray-100/90 p-1 rounded-2xl border border-gray-200/60">
            <button
              type="button"
              onClick={() => setActiveGameTab('vent')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeGameTab === 'vent'
                  ? 'bg-white text-orange-950 shadow-xs ring-1 ring-orange-200'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span>เขียนแล้วบดขยี้ทิ้ง</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveGameTab('smile')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeGameTab === 'smile'
                  ? 'bg-white text-indigo-950 shadow-xs ring-1 ring-indigo-200'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Smile className="w-3.5 h-3.5 text-indigo-600" />
              <span>ค้นหาใบหน้ายิ้ม</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain">
          {/* TAB 1: VENT AND DESTROY GAME */}
          {activeGameTab === 'vent' && (
            <VentAndDestroyGame
              onComplete={onGameComplete}
              onSwitchToSmileGame={() => setActiveGameTab('smile')}
              onClose={onClose}
            />
          )}

          {/* TAB 2: SMILE FINDER GAME */}
          {activeGameTab === 'smile' && (
            <>
              {/* STATE 1: INTRO */}
              {gameState === 'intro' && (
                <div className="text-center py-4 space-y-5">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100/90 border-2 border-amber-300 flex items-center justify-center shadow-inner text-4xl animate-bounce">
                    😊
                  </div>
                  <div>
                    <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 font-bold text-xs rounded-full mb-1">
                      ตามหาฉันสิ
                    </span>
                    <h4 className="text-xl font-bold text-gray-900">
                      หาหน้ายิ้มท่ามกลางหน้าบึ้ง
                    </h4>
                    <p className="text-xs text-gray-600 mt-2 max-w-xs mx-auto leading-relaxed">
                      ช่วยดึงความสนใจกลับมาและปรับสมดุลสมาธิอย่างนุ่มนวล
                    </p>
                  </div>

                  <div className="bg-white/80 p-3 rounded-2xl border border-amber-200/60 text-left text-xs text-gray-700 space-y-1.5 shadow-2xs">
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
                    className="w-full py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm sm:text-base shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>เริ่มเกมฝึกสมาธิ</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* STATE 2: PLAYING */}
              {gameState === 'playing' && (
                <div className="space-y-4">
                  {/* Subtle Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                      <span>
                        {gridSize === 3
                          ? 'เซต 1: วอร์มอัพ (3x3)'
                          : gridSize === 4
                          ? 'เซต 2: โฟกัส (4x4)'
                          : 'เซต 3: โฟลว์ (5x5)'}
                      </span>
                      <span>
                        รอบที่ {currentRound} / {totalPlannedRounds}
                      </span>
                    </div>
                    <div className="w-full bg-amber-200/40 h-2 rounded-full overflow-hidden">
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
                    className="grid gap-2 sm:gap-2.5 mx-auto transition-all duration-500 max-w-[320px]"
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
                            fontSize: gridSize === 3 ? '2.1rem' : gridSize === 4 ? '1.6rem' : '1.3rem',
                          }}
                        >
                          <span className={isClicked && isTarget ? 'animate-bounce' : ''}>
                            {emoji}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-center text-xs text-amber-900/70 italic">
                    "ตามหาใบหน้ายิ้ม 😊 ท่ามกลางใบหน้าบึ้งตึง"
                  </p>
                </div>
              )}

              {/* STATE 3: COMPLETED */}
              {gameState === 'completed' && (
                <div className="text-center py-4 space-y-5 animate-in fade-in">
                  <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-emerald-200/50 animate-ping" />
                    <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center text-3xl shadow-lg relative z-10">
                      🌿
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-snug">
                      "ขอบคุณที่ให้เวลาตัวเองได้พักนะ<br />หายใจเข้าลึกๆ..."
                    </h4>
                    <p className="text-xs text-gray-600 mt-2 max-w-xs mx-auto">
                      คุณได้ฝึกสมองให้หันเหออกจากความคิดด้านลบและเพิ่มสมาธิอย่างยอดเยี่ยม
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-white/90 p-4 rounded-2xl border border-emerald-200 text-xs">
                    <div className="text-left">
                      <span className="text-gray-500 block">รอบที่ฝึกสำเร็จ</span>
                      <span className="text-lg font-black text-gray-900">{records.length} รอบ</span>
                    </div>
                    <div className="text-left">
                      <span className="text-gray-500 block">เวลาตอบสนองเฉลี่ย</span>
                      <span className="text-lg font-black text-emerald-600">
                        {(avgReactionTime / 1000).toFixed(2)} วินาที
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-left">
                    <span className="text-3xl">🧘</span>
                    <div>
                      <h5 className="font-bold text-amber-900 text-xs sm:text-sm">
                        ปลดล็อคตรา: ผู้ฝึกจิตใจนิ่ง
                      </h5>
                      <p className="text-[11px] text-amber-700">
                        ฝึกมองหาความสดใสและสร้างสมาธิ
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={startGame}
                      className="flex-1 py-3 px-4 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      เล่นอีกครั้ง
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      กลับสู่หน้าหลัก
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

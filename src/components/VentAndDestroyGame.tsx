import React, { useState, useRef, useEffect } from 'react';
import { playShredderASMR, playFireBurnASMR, playPeacefulHarmony } from '../utils/audio.ts';
import confetti from 'canvas-confetti';
import {
  Flame,
  FileText,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Wind,
  Heart,
  ChevronRight,
  Smile
} from 'lucide-react';

interface VentAndDestroyGameProps {
  onComplete?: (badgeId?: string) => void;
  onSwitchToSmileGame?: () => void;
  onClose?: () => void;
}

type StepState = 'writing' | 'shredding' | 'burning' | 'relieved';

export const VentAndDestroyGame: React.FC<VentAndDestroyGameProps> = ({
  onComplete,
  onSwitchToSmileGame,
  onClose,
}) => {
  const [step, setStep] = useState<StepState>('writing');
  const [ventText, setVentText] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOverTarget, setDragOverTarget] = useState<'shredder' | 'fire' | null>(null);
  const [shredProgress, setShredProgress] = useState<number>(0);
  const [burnProgress, setBurnProgress] = useState<number>(0);
  const [destructionType, setDestructionType] = useState<'shred' | 'burn'>('shred');

  // Breathing circle guide state in relieved mode
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');

  // Touch drag coordinates for mobile
  const [touchPos, setTouchPos] = useState<{ x: number; y: number } | null>(null);
  const [touchOffset, setTouchOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const paperRef = useRef<HTMLDivElement>(null);
  const shredderDropZoneRef = useRef<HTMLDivElement>(null);
  const fireDropZoneRef = useRef<HTMLDivElement>(null);

  // Breathing loop when in 'relieved' step
  useEffect(() => {
    if (step !== 'relieved') return;

    let intervalId: any;
    let counter = 0;
    // 4s inhale, 4s hold, 4s exhale = 12s cycle
    intervalId = setInterval(() => {
      counter = (counter + 1) % 12;
      if (counter < 4) {
        setBreathPhase('inhale');
      } else if (counter < 8) {
        setBreathPhase('hold');
      } else {
        setBreathPhase('exhale');
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [step]);

  // Handle start shredding
  const startShredding = () => {
    if (step !== 'writing') return;
    setDestructionType('shred');
    setStep('shredding');
    setShredProgress(0);

    // Play ASMR shredder audio
    playShredderASMR(3.2);

    // Animation progress
    const duration = 3000;
    const startTime = performance.now();

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(100, Math.round((elapsed / duration) * 100));
      setShredProgress(progress);

      if (progress < 100) {
        requestAnimationFrame(frame);
      } else {
        finishDestruction('shred');
      }
    };
    requestAnimationFrame(frame);
  };

  // Handle start burning
  const startBurning = () => {
    if (step !== 'writing') return;
    setDestructionType('burn');
    setStep('burning');
    setBurnProgress(0);

    // Play ASMR fire crackle and wind whoosh
    playFireBurnASMR(3.6);

    const duration = 3400;
    const startTime = performance.now();

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(100, Math.round((elapsed / duration) * 100));
      setBurnProgress(progress);

      if (progress < 100) {
        requestAnimationFrame(frame);
      } else {
        finishDestruction('burn');
      }
    };
    requestAnimationFrame(frame);
  };

  // When destruction is finished
  const finishDestruction = (type: 'shred' | 'burn') => {
    setVentText('');
    setStep('relieved');

    // Healing chime
    playPeacefulHarmony();

    // Gentle celebratory confetti
    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: type === 'burn' ? ['#F97316', '#F59E0B', '#10B981', '#38BDF8'] : ['#60A5FA', '#34D399', '#A78BFA', '#F472B6'],
      });
    } catch {}

    if (onComplete) {
      onComplete('vent_shredder');
    }
  };

  // Reset to write again
  const handleReset = () => {
    setStep('writing');
    setVentText('');
    setShredProgress(0);
    setBurnProgress(0);
    setTouchPos(null);
  };

  // Touch drag for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    setTouchOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    });
    setTouchPos({ x: touch.clientX, y: touch.clientY });
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setTouchPos({ x: touch.clientX, y: touch.clientY });

    // Detect if hovering over shredder or fire drop zone
    if (shredderDropZoneRef.current) {
      const shredRect = shredderDropZoneRef.current.getBoundingClientRect();
      if (
        touch.clientX >= shredRect.left &&
        touch.clientX <= shredRect.right &&
        touch.clientY >= shredRect.top &&
        touch.clientY <= shredRect.bottom
      ) {
        setDragOverTarget('shredder');
        return;
      }
    }

    if (fireDropZoneRef.current) {
      const fireRect = fireDropZoneRef.current.getBoundingClientRect();
      if (
        touch.clientX >= fireRect.left &&
        touch.clientX <= fireRect.right &&
        touch.clientY >= fireRect.top &&
        touch.clientY <= fireRect.bottom
      ) {
        setDragOverTarget('fire');
        return;
      }
    }

    setDragOverTarget(null);
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      if (dragOverTarget === 'shredder') {
        startShredding();
      } else if (dragOverTarget === 'fire') {
        startBurning();
      }
    }
    setIsDragging(false);
    setTouchPos(null);
    setDragOverTarget(null);
  };

  // Strips generator for the paper shredder animation
  const shredStrips = Array.from({ length: 14 }).map((_, i) => ({
    id: i,
    leftPercent: (i / 14) * 100,
    widthPercent: 100 / 14,
    rotation: (i % 2 === 0 ? 1 : -1) * (2 + (i % 5) * 1.5),
    delay: (i * 0.08).toFixed(2),
  }));

  // Ash particles generator for fire animation
  const ashParticles = Array.from({ length: 32 }).map((_, i) => ({
    id: i,
    left: 10 + (i * 2.8) % 80,
    size: 4 + (i % 5) * 3,
    delay: (i * 0.07).toFixed(2),
    duration: 1.8 + (i % 4) * 0.4,
    driftX: 30 + (i % 7) * 15,
  }));

  return (
    <div className="space-y-4">
      {/* 1. WRITING & DRAGGING STAGE */}
      {step === 'writing' && (
        <div className="space-y-4">
          {/* Privacy reassurance */}
          <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 text-xs text-emerald-800 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-[11px] sm:text-xs text-emerald-800 font-medium leading-relaxed">
              ข้อความนี้จะอยู่ในหน่วยความจำชั่วคราวเท่านั้น ไม่ถูกส่งไปยัง Server หรือฐานข้อมูลใดๆ เมื่อทำลายแล้วจะสลายหายไปทันที
            </p>
          </div>

          {/* Virtual Paper Sheet */}
          <div
            ref={paperRef}
            draggable
            onDragStart={(e) => {
              setIsDragging(true);
              e.dataTransfer.setData('text/plain', 'virtual-paper');
            }}
            onDragEnd={() => setIsDragging(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`relative bg-[#FFFDF5] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-md border border-amber-200/90 transition-all duration-200 select-none ${
              isDragging ? 'opacity-80 scale-98 shadow-xl cursor-grabbing ring-2 ring-amber-400' : 'hover:shadow-lg cursor-grab'
            }`}
            style={{
              backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #E5E7EB 28px)',
              backgroundAttachment: 'local',
            }}
          >
            {/* Paper Washi-tape / Clip ornament at top */}
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-20 sm:w-24 h-5 bg-amber-200/80 backdrop-blur-xs rounded-sm shadow-xs border border-amber-300/60 rotate-[-1deg]" />

            <div className="flex items-center justify-between mb-2 pt-1 border-b border-amber-100 pb-1.5 text-xs text-amber-800/80">
              <div className="flex items-center gap-1.5 font-semibold">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>แผ่นกระดาษระบายความในใจ</span>
              </div>
              <span className="text-[11px] text-gray-400">
                {ventText.trim() ? `${ventText.length} ตัวอักษร` : 'ว่างเปล่า'}
              </span>
            </div>

            {/* Venting Textarea */}
            <textarea
              value={ventText}
              onChange={(e) => setVentText(e.target.value)}
              placeholder="พิมพ์ระบายเรื่องที่คุณกำลังหงุดหงิดหรือไม่สบายใจที่นี่ได้เลย..."
              className="w-full h-32 sm:h-36 bg-transparent text-gray-800 placeholder-gray-400 text-sm sm:text-base leading-7 resize-none outline-none font-medium selection:bg-amber-200"
              style={{ lineHeight: '28px' }}
            />

            {/* Instruction tooltip */}
            <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
              <span className="italic flex items-center gap-1 text-amber-700">
                ✨ ลากแผ่นกระดาษนี้เข้าเครื่องบด หรือเตาไฟด้านล่าง
              </span>
              {ventText.length > 0 && (
                <button
                  type="button"
                  onClick={() => setVentText('')}
                  className="text-gray-400 hover:text-red-500 transition cursor-pointer flex items-center gap-0.5"
                >
                  <Trash2 className="w-3 h-3" /> ล้างข้อความ
                </button>
              )}
            </div>
          </div>

          {/* Quick Destruction Drop Zones & Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Destination 1: Paper Shredder */}
            <div
              ref={shredderDropZoneRef}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverTarget('shredder');
              }}
              onDragLeave={() => setDragOverTarget(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverTarget(null);
                startShredding();
              }}
              onClick={startShredding}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between group active:scale-98 ${
                dragOverTarget === 'shredder'
                  ? 'border-indigo-500 bg-indigo-50/90 ring-4 ring-indigo-200 scale-102 shadow-lg'
                  : 'border-slate-300 bg-slate-50/80 hover:bg-indigo-50/60 hover:border-indigo-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition">
                    📠
                  </div>
                  <div>
                    <h5 className="font-bold text-xs sm:text-sm text-gray-900 group-hover:text-indigo-900 transition">
                      เครื่องบดกระดาษ
                    </h5>
                    <p className="text-[10px] text-gray-500">
                      บดเป็นริ้วเส้นฝอย + เสียง ASMR
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition" />
              </div>

              {/* Shredder visual slot simulation */}
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden border border-slate-300/80 mb-2">
                <div className="w-full h-full bg-slate-700/60 animate-pulse" />
              </div>

              <button
                type="button"
                className="w-full py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>บดขยี้ทิ้งทันที</span>
              </button>
            </div>

            {/* Destination 2: Fire & Ashes */}
            <div
              ref={fireDropZoneRef}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverTarget('fire');
              }}
              onDragLeave={() => setDragOverTarget(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverTarget(null);
                startBurning();
              }}
              onClick={startBurning}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between group active:scale-98 ${
                dragOverTarget === 'fire'
                  ? 'border-orange-500 bg-orange-50/90 ring-4 ring-orange-200 scale-102 shadow-lg'
                  : 'border-amber-200 bg-amber-50/70 hover:bg-orange-50/60 hover:border-orange-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition">
                    🔥
                  </div>
                  <div>
                    <h5 className="font-bold text-xs sm:text-sm text-gray-900 group-hover:text-orange-900 transition">
                      จุดไฟเผาเป็นขี้เถ้า
                    </h5>
                    <p className="text-[10px] text-gray-500">
                      เปลวไฟลุกไหม้ + ปลิวไปกับสายลม
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-orange-600 transition" />
              </div>

              {/* Flame visual slot simulation */}
              <div className="w-full bg-orange-200 h-2 rounded-full overflow-hidden border border-orange-300/80 mb-2">
                <div className="w-full h-full bg-linear-to-r from-amber-400 via-orange-500 to-red-500 animate-pulse" />
              </div>

              <button
                type="button"
                className="w-full py-1.5 px-2 bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>จุดไฟเผาทันที</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. SHREDDER ANIMATION STAGE */}
      {step === 'shredding' && (
        <div className="py-4 space-y-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl animate-spin">⚙️</span>
            <h4 className="font-extrabold text-base sm:text-lg text-slate-800">
              กำลังบดขยี้เรื่องน่าหงุดหงิดเป็นชิ้นๆ...
            </h4>
          </div>

          {/* Shredder Machine Housing */}
          <div className="relative max-w-xs mx-auto bg-slate-800 rounded-3xl p-4 text-white shadow-2xl border-4 border-slate-700 overflow-hidden">
            {/* Top machine indicator */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-700 text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                SHREDDER ACTIVE
              </span>
              <span>ASMR 100%</span>
            </div>

            {/* Feed Slot */}
            <div className="my-2 bg-slate-900 h-3 rounded-full border border-slate-600 shadow-inner flex items-center justify-center">
              <div className="w-3/4 h-1 bg-indigo-500/80 animate-pulse rounded-full" />
            </div>

            {/* Paper sinking into slot */}
            <div className="relative h-28 overflow-hidden bg-slate-900/50 rounded-xl p-2 border border-slate-700/60">
              {/* Virtual paper going down */}
              <div
                className="w-full bg-[#FFFDF5] text-gray-800 rounded-lg p-2 text-[10px] transition-transform duration-100 shadow-inner font-mono text-left leading-tight"
                style={{
                  transform: `translateY(-${shredProgress * 0.8}%)`,
                  opacity: Math.max(0, 1 - shredProgress / 100),
                }}
              >
                <div className="font-bold text-amber-800 border-b border-amber-200 pb-1 mb-1">
                  📄 ข้อความที่กำลังถูกทำลาย:
                </div>
                <div className="line-clamp-3 text-gray-600">
                  {ventText || 'ความเครียด ความหงุดหงิด และเรื่องแย่ๆ ในวันนี้'}
                </div>
              </div>
            </div>

            {/* Shredded strips spewing from bottom */}
            <div className="relative h-28 overflow-hidden mt-3 bg-slate-950/80 rounded-xl p-1 border border-slate-700">
              <div className="absolute inset-0 flex justify-between px-1">
                {shredStrips.map((strip) => (
                  <div
                    key={strip.id}
                    className="h-full bg-[#FFFDF5] border-x border-amber-200/90 shadow-sm transition-all duration-300"
                    style={{
                      width: `${strip.widthPercent - 1}%`,
                      transform: `translateY(${Math.max(0, shredProgress - 20) * 1.3}%) rotate(${strip.rotation}deg)`,
                      opacity: shredProgress > 15 ? 0.9 : 0,
                    }}
                  />
                ))}
              </div>

              {/* Shredder blade indicator */}
              <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-indigo-500 via-sky-400 to-indigo-500" />
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
                <span>กำลังทำลายเอกสาร...</span>
                <span className="font-bold text-indigo-400">{shredProgress}%</span>
              </div>
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-indigo-500 to-emerald-400 transition-all duration-100"
                  style={{ width: `${shredProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. FIRE & ASHES ANIMATION STAGE */}
      {step === 'burning' && (
        <div className="py-4 space-y-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Flame className="w-6 h-6 text-orange-500 animate-bounce" />
            <h4 className="font-extrabold text-base sm:text-lg text-orange-950">
              กำลังเผาทำลายและปล่อยให้ปลิวหายไปกับสายลม...
            </h4>
          </div>

          {/* Burning Container */}
          <div className="relative max-w-xs mx-auto h-64 bg-slate-950 rounded-3xl p-4 text-white shadow-2xl border-4 border-amber-600/40 overflow-hidden flex flex-col justify-end">
            {/* Wind and ember swirl background */}
            <div className="absolute inset-0 bg-radial from-orange-950/40 via-transparent to-black pointer-events-none" />

            {/* Ash particles flying away with wind */}
            {burnProgress > 30 && (
              <div className="absolute inset-0 pointer-events-none">
                {ashParticles.map((ash) => {
                  const ashActive = burnProgress > 30;
                  return (
                    <div
                      key={ash.id}
                      className="absolute rounded-full bg-slate-300 shadow-xs"
                      style={{
                        width: `${ash.size}px`,
                        height: `${ash.size}px`,
                        left: `${ash.left}%`,
                        bottom: '25%',
                        opacity: ashActive ? Math.max(0, 1 - (burnProgress - 30) / 70) : 0,
                        transform: `translate(${ash.driftX * ((burnProgress - 30) / 70)}px, -${((burnProgress - 30) / 70) * 160}px) rotate(${burnProgress * 4}deg)`,
                        transition: 'transform 0.1s linear, opacity 0.1s linear',
                        backgroundColor: ash.id % 3 === 0 ? '#F97316' : ash.id % 2 === 0 ? '#475569' : '#1E293B',
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* The paper dissolving into ashes */}
            <div className="relative mx-auto w-4/5 rounded-xl overflow-hidden p-3 transition-all duration-300">
              <div
                className="bg-[#FFFDF5] rounded-lg p-3 text-gray-800 text-xs shadow-md border border-amber-300 relative transition-all duration-300"
                style={{
                  clipPath: `inset(0% 0% ${burnProgress}% 0%)`,
                  filter: `brightness(${Math.max(0.2, 1 - burnProgress / 90)}) contrast(${1 + burnProgress / 50})`,
                }}
              >
                <div className="font-bold text-amber-900 border-b border-amber-200 pb-1 mb-1">
                  🔥 กำลังเผาไหม้...
                </div>
                <div className="line-clamp-2 text-gray-600">
                  {ventText || 'ความเครียดและเรื่องหงุดหงิดใจ'}
                </div>
              </div>

              {/* Burning Edge Glowing Embers */}
              {burnProgress < 95 && (
                <div
                  className="absolute left-3 right-3 h-5 pointer-events-none bg-linear-to-t from-transparent via-orange-500 to-amber-300 opacity-90 blur-xs transition-all duration-100"
                  style={{
                    bottom: `${burnProgress}%`,
                  }}
                />
              )}
            </div>

            {/* Brazier fire at bottom */}
            <div className="relative mt-2 text-center">
              <div className="text-3xl animate-pulse">🔥</div>
              <div className="text-[11px] text-amber-300 font-bold mt-1">
                ขี้เถ้ากำลังปลิวหายไปกับสายลม ({burnProgress}%)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. RELIEVED / HEALING STAGE */}
      {step === 'relieved' && (
        <div className="py-3 sm:py-5 space-y-5 text-center">
          {/* Calming icon */}
          <div className="relative w-20 h-20 mx-auto">
            <div className="w-20 h-20 rounded-full bg-linear-to-tr from-emerald-100 to-teal-50 border-2 border-emerald-300 flex items-center justify-center text-3xl shadow-lg">
              🍃
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow-xs">
              ✓
            </div>
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
              ปลดปล่อยสำเร็จ 🕊️
            </span>
            <h4 className="text-lg sm:text-xl font-black text-gray-900">
              เรื่องแย่ๆ เหล่านั้นได้สูญสลายไปหมดแล้ว
            </h4>
            <p className="text-xs sm:text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">
              {destructionType === 'shred'
                ? 'กระดาษแผ่นนั้นถูกบดขยี้เป็นชิ้นเล็กชิ้นน้อย และไม่สามารถกลับมาทำร้ายใจคุณได้อีก'
                : 'เรื่องน่าหงุดหงิดเหล่านั้นถูกเผาเป็นเถ้าถ่าน และปลิวสลายไปกับสายลมหมดแล้ว'}
            </p>
          </div>

          {/* Guided 4-4-4 Breathing Exercise Widget */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-3xl p-4 sm:p-5 max-w-sm mx-auto shadow-2xs">
            <p className="text-xs font-bold text-emerald-900 mb-2 flex items-center justify-center gap-1.5">
              <Wind className="w-4 h-4 text-emerald-600" />
              ผ่อนคลายร่างกาย: จังหวะลมหายใจเพื่อความสงบ
            </p>

            <div className="relative w-24 h-24 mx-auto my-3 flex items-center justify-center">
              {/* Outer pulsing ring */}
              <div
                className={`absolute inset-0 rounded-full bg-emerald-200/60 transition-transform duration-1000 ease-in-out ${
                  breathPhase === 'inhale'
                    ? 'scale-110 bg-emerald-300/70'
                    : breathPhase === 'hold'
                    ? 'scale-100 bg-emerald-400/60'
                    : 'scale-90 bg-emerald-200/40'
                }`}
              />
              <div className="relative z-10 text-center">
                <span className="text-xs font-extrabold text-emerald-900 block">
                  {breathPhase === 'inhale'
                    ? 'หายใจเข้า 🫁'
                    : breathPhase === 'hold'
                    ? 'กลั้นหายใจ ⏸️'
                    : 'ผ่อนลมหายใจ 💨'}
                </span>
                <span className="text-[10px] text-emerald-700 font-medium">ลึกและช้าๆ</span>
              </div>
            </div>

            <p className="text-[11px] text-emerald-800 mt-2">
              ปล่อยวางความตึงเครียดในบ่าและไหล่... คุณเก่งมากที่ให้เวลาตัวเองได้พักใจ
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2 max-w-sm mx-auto">
            <button
              type="button"
              onClick={handleReset}
              className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>เขียนระบายอีกเรื่อง</span>
            </button>

            {onSwitchToSmileGame && (
              <button
                type="button"
                onClick={onSwitchToSmileGame}
                className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Smile className="w-3.5 h-3.5 text-indigo-600" />
                <span>เล่นเกมหาหน้ายิ้ม</span>
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto py-2.5 px-5 rounded-2xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition cursor-pointer shadow-xs"
              >
                <span>กลับสู่หน้าหลัก</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

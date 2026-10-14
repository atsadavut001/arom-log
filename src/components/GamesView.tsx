import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VentAndDestroyGame } from './VentAndDestroyGame.tsx';
import { SmileFinderGame } from './SmileFinderGame.tsx';
import {
  Gamepad2,
  Flame,
  Smile,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

interface GamesViewProps {
  onGameComplete?: (badgeId?: string) => void;
}

export const GamesView: React.FC<GamesViewProps> = ({ onGameComplete }) => {
  const { gameId } = useParams<{ gameId?: string }>();
  const navigate = useNavigate();

  const activeGame = gameId === 'vent' || gameId === 'smile' ? gameId : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in">
      {/* 1. TOP HEADER / BREADCRUMB */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-amber-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                ศูนย์รวมมินิเกมคลายเครียด
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                Mindfulness
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              ผ่อนคลายจิตใจ ปลดปล่อยความเครียด หรือฝึกสมาธิเบาๆ เพื่อคืนความสดชื่น
            </p>
          </div>
        </div>

        {/* Back Button or Game Switcher */}
        {activeGame ? (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => navigate('/games')}
              className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>หน้ารวมเกม</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(activeGame === 'vent' ? '/games/smile' : '/games/vent')}
              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              {activeGame === 'vent' ? (
                <>
                  <Smile className="w-3.5 h-3.5 text-amber-600" />
                  <span>สลับไปเกมหน้ายิ้ม</span>
                </>
              ) : (
                <>
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span>สลับไปเกมบดกระดาษ</span>
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>

      {/* 2. GAME LOBBY (When no specific game is chosen) */}
      {!activeGame && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* GAME CARD 1: VENT AND DESTROY */}
            <div className="bg-gradient-to-br from-white via-orange-50/30 to-amber-50/50 rounded-3xl p-6 sm:p-7 border border-orange-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-orange-300/10 rounded-full blur-2xl pointer-events-none" />

              <div className="space-y-4">
                {/* Icon & Badge */}
                <div className="flex items-start justify-between">
                  <div className="w-16 h-16 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center text-3xl shadow-xs group-hover:scale-105 transition-transform">
                    📄
                  </div>
                  <span className="px-3 py-1 rounded-full bg-orange-100/90 text-orange-800 border border-orange-200 text-[11px] font-bold flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-400" />
                    <span>ปลดปล่อยอารมณ์</span>
                  </span>
                </div>

                {/* Content */}
                <div>
                  <h3 className="text-xl font-black text-gray-900 group-hover:text-orange-950 transition-colors">
                    เขียนแล้วบดขยี้ทิ้ง (Vent & Shred)
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
                    เขียนความในใจ ความกังวล หรือความโกรธที่ค้างคาลงบนกระดาษ แล้วเลือกลากเข้าเครื่องบดกระดาษ ขยำทิ้ง หรือจุดไฟเผาให้มลายหายไป
                  </p>
                </div>

                {/* Highlights */}
                <div className="space-y-1.5 pt-1 text-xs text-stone-600">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-600 font-bold">⚡ เอฟเฟกต์ฟิสิกส์:</span>
                    <span>เครื่องบดกระดาษสมจริง</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-600 font-bold">🔥 จุดไฟเผา:</span>
                    <span>แอนิเมชันเผากระดาษเป็นเถ้าถ่าน</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 font-bold">🔒 ความเป็นส่วนตัว:</span>
                    <span>ไม่บันทึกข้อความใดๆ ลงระบบ</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6">
                <button
                  type="button"
                  onClick={() => navigate('/games/vent')}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-98 text-white font-black text-sm transition shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>เล่นเกมบดกระดาษ</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* GAME CARD 2: SMILE FINDER */}
            <div className="bg-gradient-to-br from-white via-indigo-50/30 to-amber-50/50 rounded-3xl p-6 sm:p-7 border border-indigo-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-indigo-300/10 rounded-full blur-2xl pointer-events-none" />

              <div className="space-y-4">
                {/* Icon & Badge */}
                <div className="flex items-start justify-between">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-3xl shadow-xs group-hover:scale-105 transition-transform">
                    😊
                  </div>
                  <span className="px-3 py-1 rounded-full bg-indigo-100/90 text-indigo-800 border border-indigo-200 text-[11px] font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ฝึกสมาธิ & สติ</span>
                  </span>
                </div>

                {/* Content */}
                <div>
                  <h3 className="text-xl font-black text-gray-900 group-hover:text-indigo-950 transition-colors">
                    ค้นหาใบหน้ายิ้ม (Smile Finder)
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
                    ตามหาใบหน้ายิ้มที่ซ่อนอยู่ท่ามกลางใบหน้าบึ้งตึง 3 ระดับ (3x3, 4x4, 5x5) ช่วยดึงสมาธิกลับสู่ความสงบและฝึกมองหาสิ่งดีๆ
                  </p>
                </div>

                {/* Highlights */}
                <div className="space-y-1.5 pt-1 text-xs text-stone-600">
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-600 font-bold">🧠 ฝึกสมอง:</span>
                    <span>ปรับโฟกัสออกจากความคิดลบ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-600 font-bold">🔔 เสียงดนตรีผ่อนคลาย:</span>
                    <span>Harmonic chimes บำบัดใจ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-700 font-bold">🏆 รับเหรียญรางวัล:</span>
                    <span>ปลดล็อคตราผู้ฝึกจิตใจนิ่ง</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6">
                <button
                  type="button"
                  onClick={() => navigate('/games/smile')}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-500 to-amber-500 hover:from-indigo-600 hover:to-amber-600 active:scale-98 text-white font-black text-sm transition shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>เล่นเกมตามหาหน้ายิ้ม</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. ACTIVE GAME PLAY AREA */}
      {activeGame === 'vent' && (
        <div className="bg-white rounded-3xl p-5 sm:p-8 border border-orange-200/90 shadow-sm">
          <VentAndDestroyGame
            onComplete={onGameComplete}
            onSwitchToSmileGame={() => navigate('/games/smile')}
            onClose={() => navigate('/games')}
          />
        </div>
      )}

      {activeGame === 'smile' && (
        <div className="py-2">
          <SmileFinderGame
            onComplete={onGameComplete}
            onBackToHub={() => navigate('/games')}
            onSwitchToVentGame={() => navigate('/games/vent')}
          />
        </div>
      )}
    </div>
  );
};

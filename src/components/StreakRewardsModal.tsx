import React, { useState, useEffect } from 'react';
import { STREAK_BADGES, StreakBadge } from '../types.ts';
import {
  Award,
  Lock,
  Calendar,
  X,
  Zap
} from 'lucide-react';

interface StreakRewardsModalProps {
  streak: number;
  longestStreak: number;
  unlockedBadgeIds: string[];
  recordedDates: string[]; // YYYY-MM-DD
  onClose: () => void;
}

export const StreakRewardsModal: React.FC<StreakRewardsModalProps> = ({
  streak,
  longestStreak,
  unlockedBadgeIds,
  recordedDates,
  onClose,
}) => {
  const [selectedBadge, setSelectedBadge] = useState<StreakBadge | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent background scroll while modal is open on mobile
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Generate current week's 7 days for the Duolingo flame track
  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 is Sunday
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - currentDayOfWeek);

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    const isToday = dateStr === today.toISOString().split('T')[0];
    const isRecorded = recordedDates.includes(dateStr);
    const isPast = d <= today;

    return {
      dayName: dayNames[i],
      dateStr,
      isToday,
      isRecorded,
      isPast,
    };
  });

  // Next milestone calculation
  const streakMilestones = [3, 7, 14, 30, 50, 100];
  const nextMilestone = streakMilestones.find((m) => m > streak) || 100;
  const progressPercent = Math.min(100, Math.round((streak / nextMilestone) * 100));

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="streak-modal-title"
    >
      {/* Modal Dialog with bounded height and scrollable body */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white max-w-lg w-full max-h-[85dvh] sm:max-h-[85vh] my-auto rounded-2xl sm:rounded-3xl shadow-2xl border border-orange-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Sticky Header: ALWAYS visible on all screen sizes with touch-friendly Close button */}
        <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100 flex items-center justify-between bg-white z-20">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl animate-pulse">🔥</span>
            <div>
              <h3 id="streak-modal-title" className="font-extrabold text-gray-900 text-sm sm:text-base leading-tight">
                สถิติต่อเนื่อง & หีบรางวัล
              </h3>
              <p className="text-[11px] text-orange-700">
                Duolingo-style Streak & Rewards
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center -mr-1 p-2 text-gray-500 hover:text-gray-900 active:bg-gray-200 hover:bg-gray-100 rounded-full transition cursor-pointer touch-manipulation"
            aria-label="ปิดหน้าต่างสถิติ"
            title="ปิดหน้าต่าง (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Area: min-h-0 is essential to prevent flexbox mobile overflow bug */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-5 overscroll-contain">
          {/* Duolingo Flame Hero Card */}
          <div className="bg-linear-to-br from-amber-500 via-orange-500 to-rose-500 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 text-white text-center shadow-md relative overflow-hidden shrink-0">
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full filter blur-xl" />
            <div className="relative z-10 space-y-1 sm:space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/20 backdrop-blur-xs ring-3 sm:ring-4 ring-white/40 shadow-inner">
                <span className="text-2xl sm:text-4xl filter drop-shadow-md animate-bounce">
                  🔥
                </span>
              </div>

              <div className="flex items-baseline justify-center gap-1.5 sm:gap-2">
                <span className="text-3xl sm:text-4xl font-black tracking-tight">{streak}</span>
                <span className="text-sm sm:text-lg font-bold opacity-90">วันติดต่อกัน!</span>
              </div>

              <p className="text-xs text-orange-100 font-medium max-w-xs mx-auto leading-relaxed">
                {streak > 0
                  ? 'เปลวไฟแห่งความใส่ใจกำลังลุกโชน บันทึกทุกวันเพื่อไม่ให้ไฟดับ'
                  : 'บันทึกอารมณ์วันนี้เพื่อจุดประกายไฟแห่งสติวันแรก!'}
              </p>
            </div>
          </div>

          {/* Weekly Flame Tracker */}
          <div className="space-y-1.5 sm:space-y-2 bg-orange-50/70 p-3 sm:p-4 rounded-2xl border border-orange-200/80">
            <div className="flex items-center justify-between text-xs font-bold text-orange-950">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-orange-600" />
                ตารางบันทึกสัปดาห์นี้
              </span>
              <span className="text-orange-700 font-medium text-[11px]">
                สถิติสูงสุด: {longestStreak} วัน
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 pt-1">
              {weekDays.map((day) => (
                <div
                  key={day.dateStr}
                  className={`py-1.5 sm:py-2 px-0.5 rounded-xl text-center flex flex-col items-center justify-between gap-0.5 transition ${
                    day.isToday
                      ? 'ring-2 ring-orange-500 bg-white shadow-2xs'
                      : 'bg-white/80'
                  }`}
                >
                  <span className="text-[10px] font-bold text-gray-500">{day.dayName}</span>
                  <span className="text-sm sm:text-base">
                    {day.isRecorded ? '🔥' : day.isPast ? '⚪' : '🕒'}
                  </span>
                  <span className="text-[9px] text-gray-400">
                    {day.dateStr.slice(8)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Next Milestone Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-gray-700">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                เป้าหมายถัดไป: {nextMilestone} วัน
              </span>
              <span className="text-amber-800">{streak} / {nextMilestone} วัน</span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                style={{ width: `${progressPercent}%` }}
                className="h-full bg-linear-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
              />
            </div>
          </div>

          {/* Badges Collection Showcase */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-900 text-xs sm:text-sm flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-600" />
                เหรียญรางวัลเกียรติยศ (Badges)
              </h4>
              <span className="text-[11px] text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded-full">
                ปลดล็อค {unlockedBadgeIds.length} / {STREAK_BADGES.length}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STREAK_BADGES.map((badge) => {
                const isUnlocked = unlockedBadgeIds.includes(badge.id);

                return (
                  <button
                    key={badge.id}
                    type="button"
                    onClick={() => setSelectedBadge(badge)}
                    className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center justify-between gap-1 cursor-pointer select-none touch-manipulation ${
                      isUnlocked
                        ? 'bg-amber-50/80 border-amber-300 shadow-2xs hover:scale-105 active:scale-95'
                        : 'bg-gray-50 border-gray-200 opacity-60 hover:opacity-80'
                    }`}
                  >
                    <div className="relative">
                      <span className={`text-2xl sm:text-3xl ${isUnlocked ? 'filter drop-shadow-sm' : 'grayscale'}`}>
                        {badge.icon}
                      </span>
                      {!isUnlocked && (
                        <span className="absolute -top-1 -right-1 bg-gray-600 text-white p-0.5 rounded-full">
                          <Lock className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-[11px] sm:text-xs text-gray-900 line-clamp-1 mt-0.5">
                      {badge.title}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-gray-500 line-clamp-1">
                      {badge.requiredStreak ? `${badge.requiredStreak} วัน` : 'ภารกิจ'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Badge Detail Submodal when clicked */}
          {selectedBadge && (
            <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{selectedBadge.icon}</span>
                  <h5 className="font-bold text-amber-950 text-xs sm:text-sm">{selectedBadge.title}</h5>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  unlockedBadgeIds.includes(selectedBadge.id)
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {unlockedBadgeIds.includes(selectedBadge.id) ? 'ปลดล็อคแล้ว ✅' : 'ยังไม่ปลดล็อค 🔒'}
                </span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">{selectedBadge.description}</p>
            </div>
          )}
        </div>

        {/* Sticky Footer Action Bar: Always accessible at bottom on mobile */}
        <div className="shrink-0 p-3 sm:p-4 border-t border-gray-100 bg-gray-50/90 z-20">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 sm:py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-gray-700 bg-white hover:bg-gray-100 active:scale-98 border border-gray-200 shadow-2xs transition cursor-pointer flex items-center justify-center gap-1.5 touch-manipulation"
          >
            <X className="w-4 h-4 text-gray-500" />
            <span>ปิดหน้าต่างสถิติ</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { MoodEntry, MOOD_PRESETS } from '../types.ts';
import { User } from 'firebase/auth';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Eye,
  Heart,
  X
} from 'lucide-react';

interface CalendarViewProps {
  entries: MoodEntry[];
  selectedMonth: string; // YYYY-MM
  onMonthChange: (month: string) => void;
  onSelectDateForEdit?: (dateStr: string) => void;
  readOnly?: boolean;
  userName?: string;
  title?: string;
  subtitle?: string;
  hideReminderBanner?: boolean;
  hideMonthNavigation?: boolean;
  hideLegend?: boolean;
  currentUser?: User;
  onToggleLike?: (entry: MoodEntry) => Promise<void>;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  entries,
  selectedMonth,
  onMonthChange,
  onSelectDateForEdit,
  readOnly = false,
  userName,
  title,
  subtitle,
  hideReminderBanner = false,
  hideMonthNavigation = false,
  hideLegend = false,
  currentUser,
  onToggleLike,
}) => {
  const [activeEntryModal, setActiveEntryModal] = useState<MoodEntry | null>(null);

  const [year, month] = selectedMonth.split('-').map(Number);

  // Month navigation
  const handlePrevMonth = () => {
    const d = new Date(year, month - 2, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const d = new Date(year, month, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const formatMonthThai = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return `${thaiMonths[m - 1]} ${y + 543}`;
  };

  // Build calendar matrix
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 is Sunday

  // Map entries by date YYYY-MM-DD
  const entriesByDate = entries.reduce((acc, curr) => {
    acc[curr.date] = curr;
    return acc;
  }, {} as Record<string, MoodEntry>);

  const todayStr = new Date().toISOString().split('T')[0];

  const weekDayHeaders = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const displayTitle = title || (userName ? `ปฏิทินของ${userName}` : 'ปฏิทินบันทึกอารมณ์');

  return (
    <div className="bg-white rounded-3xl p-5 md:p-8 shadow-sm border border-gray-100 max-w-4xl mx-auto space-y-6">
      {/* Header and Month Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 md:w-6 md:h-6 text-amber-500 shrink-0" />
            <span>{displayTitle}</span>
          </h2>
          {subtitle !== undefined ? (
            subtitle ? <p className="text-xs md:text-sm text-gray-500 mt-1">{subtitle}</p> : null
          ) : (
            <p className="text-xs md:text-sm text-gray-500 mt-1">
              {userName
                ? `บันทึกอารมณ์ประจำเดือนของ ${userName}`
                : 'แทนที่วันในแต่ละเดือนด้วยไอคอนอารมณ์ เพื่อมองเห็นแนวโน้มความรู้สึกแบบองค์รวม'}
            </p>
          )}
        </div>

        {/* Month selector navigation */}
        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-200 self-start sm:self-auto">
          {!hideMonthNavigation && (
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white text-gray-700 rounded-xl transition cursor-pointer"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div className="px-3 text-xs md:text-sm font-bold text-gray-800 min-w-[130px] text-center">
            {formatMonthThai(selectedMonth)}
          </div>
          {!hideMonthNavigation && (
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white text-gray-700 rounded-xl transition cursor-pointer"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Reminder Banner if Today is not recorded yet (Only in own active mode) */}
      {!readOnly && !hideReminderBanner && onSelectDateForEdit && !entriesByDate[todayStr] && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">✨</span>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                วันนี้คุณยังไม่ได้บันทึกอารมณ์ ({todayStr})
              </h4>
              <p className="text-xs text-amber-800">
                แวะมาบอกความรู้สึกของคุณเพื่อใส่ลูกแก้วลงในโหลอารมณ์และเติมเต็มปฏิทินวันนี้กันเถอะ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectDateForEdit(todayStr)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            บันทึกอารมณ์วันนี้
          </button>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200 text-center py-2.5 text-xs font-bold text-gray-600">
          {weekDayHeaders.map((day, idx) => (
            <div key={day} className={idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : ''}>
              {day}
            </div>
          ))}
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 auto-rows-fr bg-gray-100 gap-px">
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-gray-50/50 min-h-[56px] sm:min-h-[75px] md:min-h-[95px] p-1 sm:p-2 opacity-30" />
          ))}

          {/* Month days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dayStr = `${selectedMonth}-${String(dayNum).padStart(2, '0')}`;
            const entry = entriesByDate[dayStr];
            const isToday = dayStr === todayStr;
            const isFuture = dayStr > todayStr;

            return (
              <div
                key={dayStr}
                onClick={() => {
                  if (entry) {
                    setActiveEntryModal(entry);
                  } else if (!isFuture && !readOnly && onSelectDateForEdit) {
                    onSelectDateForEdit(dayStr);
                  }
                }}
                className={`bg-white min-h-[56px] sm:min-h-[75px] md:min-h-[95px] p-1 sm:p-2 relative flex flex-col justify-between transition-all group select-none ${
                  isFuture
                    ? 'opacity-40 cursor-not-allowed bg-gray-50/40'
                    : !entry && (readOnly || !onSelectDateForEdit)
                    ? 'cursor-default'
                    : 'cursor-pointer hover:bg-amber-50/30 active:bg-amber-100/50'
                } ${isToday ? 'ring-2 ring-amber-500 ring-inset' : ''}`}
              >
                {/* Day Number and status */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] sm:text-xs font-bold rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center ${
                      isToday
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'text-gray-700'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {entry && (
                    <span
                      style={{ backgroundColor: entry.moodColor }}
                      className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0"
                    />
                  )}
                </div>

                {/* Mood Icon replacement / decoration (FR3.1) */}
                <div className="flex-1 flex flex-col items-center justify-center py-0.5">
                  {entry ? (
                    <div className="flex flex-col items-center">
                      {entry.customDrawing ? (
                        <img
                          src={entry.customDrawing}
                          alt="Custom Face"
                          className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full border border-amber-300 shadow-2xs object-cover group-hover:scale-110 transition-transform"
                        />
                      ) : (
                        <span className="text-xl sm:text-2xl md:text-3xl filter drop-shadow-2xs group-hover:scale-115 transition-transform">
                          {MOOD_PRESETS.find((p) => p.type === entry.moodType)?.emoji || '😊'}
                        </span>
                      )}
                      <span className="text-[9px] sm:text-[10px] md:text-[11px] font-semibold text-gray-700 truncate mt-0.5 max-w-[42px] sm:max-w-[55px] text-center hidden xs:block">
                        {entry.moodLabel}
                      </span>
                    </div>
                  ) : !isFuture && !readOnly && onSelectDateForEdit ? (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center justify-center text-gray-400 hover:text-amber-600 transition">
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      {!hideLegend && (
        <div className="pt-2">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            สัญลักษณ์อารมณ์
          </h4>
          <div className="flex flex-wrap gap-2.5">
            {MOOD_PRESETS.map((preset) => (
              <div
                key={preset.type}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-700"
              >
                <span>{preset.emoji}</span>
                <span className="font-medium">{preset.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entry Detail Modal when day clicked */}
      {activeEntryModal && (
        <div
          onClick={() => setActiveEntryModal(null)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full max-h-[90dvh] my-auto overflow-y-auto shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-gray-900 text-sm">
                  บันทึกวันที่ {activeEntryModal.date}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveEntryModal(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mood Header */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50/70 border border-amber-200">
              {activeEntryModal.customDrawing ? (
                <img
                  src={activeEntryModal.customDrawing}
                  alt="Custom Drawing"
                  className="w-12 h-12 rounded-full border-2 border-amber-400 object-cover"
                />
              ) : (
                <span className="text-4xl">
                  {MOOD_PRESETS.find((p) => p.type === activeEntryModal.moodType)?.emoji || '✨'}
                </span>
              )}
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  {activeEntryModal.moodLabel}
                </h3>
                <p className="text-xs text-gray-500">
                  คะแนนความรู้สึก: {activeEntryModal.moodScore} {activeEntryModal.moodScore > 5 ? '/ 10' : `/ 10 (${activeEntryModal.moodScore}/5)`}
                </p>
              </div>
            </div>

            {/* Note */}
            {activeEntryModal.note && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">บันทึก:</label>
                <p className="text-sm text-gray-800 bg-gray-50 p-3.5 rounded-2xl border border-gray-100 whitespace-pre-wrap">
                  {activeEntryModal.note}
                </p>
              </div>
            )}

            {/* Photo */}
            {activeEntryModal.photoUrl && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">รูปภาพประจำวัน:</label>
                <img
                  src={activeEntryModal.photoUrl}
                  alt="Daily mood attachment"
                  className="w-full max-h-56 object-cover rounded-2xl border border-gray-200 shadow-xs"
                />
              </div>
            )}

            {/* Tags */}
            {activeEntryModal.tags && activeEntryModal.tags.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">กิจกรรม/บริบท:</label>
                <div className="flex flex-wrap gap-1.5">
                  {activeEntryModal.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-900 rounded-xl"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
              {currentUser && onToggleLike ? (
                <button
                  type="button"
                  onClick={() => onToggleLike(activeEntryModal)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer active:scale-95 ${
                    (activeEntryModal.likes || []).includes(currentUser.uid)
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : 'bg-white hover:bg-rose-50/60 border-gray-200 text-gray-700'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      (activeEntryModal.likes || []).includes(currentUser.uid)
                        ? 'fill-rose-500 text-rose-500'
                        : 'text-rose-500'
                    }`}
                  />
                  <span>
                    {activeEntryModal.likesCount || (activeEntryModal.likes || []).length || 0} กำลังใจ
                  </span>
                </button>
              ) : (
                <div />
              )}

              {!readOnly && onSelectDateForEdit && (
                <button
                  type="button"
                  onClick={() => {
                    const targetDate = activeEntryModal.date;
                    setActiveEntryModal(null);
                    onSelectDateForEdit(targetDate);
                  }}
                  className="px-4 py-2 text-xs md:text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition cursor-pointer"
                >
                  แก้ไขบันทึกวันนี้
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

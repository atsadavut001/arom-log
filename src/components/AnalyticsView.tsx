import React, { useEffect, useState } from 'react';
import { MoodEntry, MOOD_PRESETS } from '../types.ts';
import { generateMoodInsight, isGeminiConfigured } from '../gemini.ts';
import {
  TrendingUp,
  Award,
  AlertTriangle,
  Smile,
  BarChart3,
  Calendar,
  Sparkles,
  Zap,
  Loader2,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';

interface AnalyticsViewProps {
  entries: MoodEntry[];
  selectedMonth: string; // YYYY-MM
  onMonthChange: (month: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  entries,
  selectedMonth,
}) => {
  const monthEntries = entries.filter((e) => e.date.startsWith(selectedMonth));

  // Mood Insight state (Gemini)
  const [insightText, setInsightText] = useState<string>('');
  const [insightLoading, setInsightLoading] = useState<boolean>(false);
  const [insightError, setInsightError] = useState<string>('');

  // Reset insight when switching month so results never mix between months
  useEffect(() => {
    setInsightText('');
    setInsightError('');
  }, [selectedMonth]);

  // 1. Dominant Mood
  const moodCounts: Record<string, number> = {};
  monthEntries.forEach((entry) => {
    moodCounts[entry.moodType] = (moodCounts[entry.moodType] || 0) + 1;
  });

  let dominantMoodType = '';
  let dominantMoodCount = 0;
  Object.entries(moodCounts).forEach(([type, count]) => {
    if (count > dominantMoodCount) {
      dominantMoodCount = count;
      dominantMoodType = type;
    }
  });

  const dominantPreset = MOOD_PRESETS.find((p) => p.type === dominantMoodType);
  const dominantPercentage =
    monthEntries.length > 0
      ? Math.round((dominantMoodCount / monthEntries.length) * 100)
      : 0;

  // 2. Average Mood Score (Normalized to 0 - 10 scale)
  const totalScore10 = monthEntries.reduce((sum, e) => {
    const s = e.moodScore !== undefined ? e.moodScore : 5;
    return sum + (s <= 5 && s > 0 ? s * 2 : s);
  }, 0);
  const averageScore =
    monthEntries.length > 0 ? (totalScore10 / monthEntries.length).toFixed(1) : '0';

  // 3. Positive vs Negative ratio
  // Negative presets: sad, angry, anxious, tired
  const negativeTypes = ['sad', 'angry', 'anxious', 'tired'];
  const positiveTypes = ['happy', 'excited', 'calm'];

  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  monthEntries.forEach((e) => {
    if (positiveTypes.includes(e.moodType)) positiveCount++;
    else if (negativeTypes.includes(e.moodType)) negativeCount++;
    else neutralCount++;
  });

  const positivePercent =
    monthEntries.length > 0 ? Math.round((positiveCount / monthEntries.length) * 100) : 0;
  const negativePercent =
    monthEntries.length > 0 ? Math.round((negativeCount / monthEntries.length) * 100) : 0;

  // 4. Activity Tag Correlations:
  // Which tags occur most with Negative moods vs Positive moods
  const negativeTagCounts: Record<string, number> = {};
  const positiveTagCounts: Record<string, number> = {};

  monthEntries.forEach((entry) => {
    const isNegative = negativeTypes.includes(entry.moodType);
    const isPositive = positiveTypes.includes(entry.moodType);

    (entry.tags || []).forEach((tag) => {
      if (isNegative) {
        negativeTagCounts[tag] = (negativeTagCounts[tag] || 0) + 1;
      }
      if (isPositive) {
        positiveTagCounts[tag] = (positiveTagCounts[tag] || 0) + 1;
      }
    });
  });

  const sortedNegativeTags = Object.entries(negativeTagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const sortedPositiveTags = Object.entries(positiveTagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 5. Calculate Consecutive Streak
  const sortedDates = [...entries]
    .map((e) => e.date)
    .sort()
    .reverse();

  let streak = 0;
  if (sortedDates.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkDate = new Date(today);
    // Check if recorded today or yesterday to continue streak
    const todayStr = checkDate.toISOString().split('T')[0];
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayStr = checkDate.toISOString().split('T')[0];

    if (sortedDates.includes(todayStr) || sortedDates.includes(yesterdayStr)) {
      let currentDate = sortedDates.includes(todayStr) ? new Date(today) : checkDate;
      while (true) {
        const dStr = currentDate.toISOString().split('T')[0];
        if (sortedDates.includes(dStr)) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }
    }
  }

  // Mood Insight handler (Gemini)
  const handleGenerateInsight = async () => {
    if (!isGeminiConfigured()) {
      setInsightError('ยังไม่ได้ตั้งค่าคีย์ AI — เพิ่ม GEMINI_API_KEY หรือ VITE_GEMINI_API_KEY ใน .env แล้ว build ใหม่');
      return;
    }

    setInsightLoading(true);
    setInsightError('');
    try {
      const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      const [yStr, mStr] = selectedMonth.split('-');
      const year = Number(yStr);
      const monthIdx = Number(mStr) - 1;
      const monthLabel = `${thaiMonths[monthIdx] || selectedMonth} ${year + 543}`;

      const text = await generateMoodInsight({ monthLabel, entries: monthEntries });
      setInsightText(text);
    } catch (err) {
      console.error('Mood Insight error:', err);
      setInsightText('');
      setInsightError('สร้างสรุปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setInsightLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 sm:pb-6 border-b border-gray-100">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mt-2">
          บทวิเคราะห์สุขภาพใจ & ความสัมพันธ์ของกิจกรรม
        </h2>
        <p className="text-xs md:text-sm text-gray-500 mt-0.5">
          ทำความเข้าใจแบบแผนอารมณ์ ค้นหากิจกรรมที่สร้างพลังบวก และปัจจัยที่มักก่อให้เกิดความเครียด
        </p>
      </div>

      {monthEntries.length === 0 ? (
        <div className="text-center py-12 px-4 bg-gray-50 rounded-3xl border border-gray-200/80">
          <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <h4 className="font-bold text-gray-700 text-base">ยังไม่มีข้อมูลในเดือนนี้</h4>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            เริ่มบันทึกอารมณ์ของคุณอย่างน้อย 1-2 วัน เพื่อให้ระบบเริ่มประมวลผลสถิติและแบบแผนกิจกรรม
          </p>
        </div>
      ) : (
        <>
          {/* Top Key Metrics Cards (2 cols on mobile, 4 on desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {/* 1. Dominant Mood */}
            <div className="p-3 sm:p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600" />
                อารมณ์เด่น
              </span>
              <div className="my-2 sm:my-3 flex items-center gap-2 sm:gap-3">
                <span className="text-2xl sm:text-3xl shrink-0">{dominantPreset?.emoji || '✨'}</span>
                <div>
                  <div className="font-extrabold text-gray-900 text-xs sm:text-base line-clamp-1">
                    {dominantPreset?.label || 'ไม่มีข้อมูล'}
                  </div>
                  <div className="text-[10px] sm:text-xs text-amber-700 font-semibold">
                    {dominantMoodCount} วัน ({dominantPercentage}%)
                  </div>
                </div>
              </div>
              <span className="text-[10px] sm:text-[11px] text-gray-500">พบมากที่สุดในเดือนนี้</span>
            </div>

            {/* 2. Average Mood Score */}
            <div className="p-3 sm:p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
                คะแนนเฉลี่ย
              </span>
              <div className="my-2 sm:my-3 flex items-baseline gap-1 sm:gap-2">
                <span className="text-2xl sm:text-3xl font-black text-gray-900">{averageScore}</span>
                <span className="text-[10px] sm:text-xs font-bold text-emerald-700">/ 10</span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-gray-500">
                {Number(averageScore) >= 7 ? 'อยู่ในเกณฑ์ดีเยี่ยม' : Number(averageScore) >= 5 ? 'อยู่ในเกณฑ์ปกติ' : 'เหนื่อยล้าพอสมควร'}
              </span>
            </div>

            {/* 3. Streak */}
            <div className="p-3 sm:p-4 rounded-2xl bg-orange-50/70 border border-orange-200 flex flex-col justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-orange-800 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-600" />
                ต่อเนื่อง (Streak)
              </span>
              <div className="my-2 sm:my-3 flex items-baseline gap-1 sm:gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-gray-900">{streak}</span>
                <span className="text-[10px] sm:text-xs font-bold text-orange-700">วันติดกัน</span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-gray-500">สังเกตใจสม่ำเสมอ</span>
            </div>

            {/* 4. Total recorded */}
            <div className="p-3 sm:p-4 rounded-2xl bg-sky-50/70 border border-sky-200 flex flex-col justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1">
                <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-600" />
                บันทึกในเดือน
              </span>
              <div className="my-2 sm:my-3 flex items-baseline gap-1 sm:gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-gray-900">{monthEntries.length}</span>
                <span className="text-[10px] sm:text-xs font-bold text-sky-700">วัน</span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-gray-500">พลังบวก {positivePercent}%</span>
            </div>
          </div>

          {/* Emotion Balance Bar */}
          <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-emerald-700 flex items-center gap-1">
                <Smile className="w-4 h-4" /> อารมณ์เชิงบวก ({positiveCount} วัน - {positivePercent}%)
              </span>
              <span className="text-rose-700 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> อารมณ์ท้าทาย/ลบ ({negativeCount} วัน - {negativePercent}%)
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${positivePercent}%` }}
                className="bg-emerald-500 transition-all duration-500"
              />
              <div
                style={{ width: `${negativePercent}%` }}
                className="bg-rose-500 transition-all duration-500"
              />
            </div>
          </div>

          {/* FR3.3 Deep Activity Correlations: Positive vs Negative Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Positive Tags */}
            <div className="border border-emerald-200 rounded-2xl p-5 bg-emerald-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
                  <Smile className="w-4 h-4 text-emerald-600" />
                  กิจกรรมที่มักเกิดคู่กับ "อารมณ์เชิงบวก"
                </h4>
                <span className="text-xs text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                  Happy Factors
                </span>
              </div>
              <p className="text-xs text-gray-500">
                เมื่อทำกิจกรรมเหล่านี้ คุณมีแนวโน้มจะรู้สึกมีความสุข สงบ หรือมีพลัง
              </p>

              {sortedPositiveTags.length > 0 ? (
                <div className="space-y-2 pt-2">
                  {sortedPositiveTags.map(([tag, count]) => (
                    <div
                      key={tag}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-emerald-100 shadow-2xs text-xs"
                    >
                      <span className="font-bold text-gray-800">{tag}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{count} ครั้ง</span>
                        <div className="w-16 bg-emerald-100 h-2 rounded-full overflow-hidden">
                          <div
                            style={{
                              width: `${Math.min(100, (count / Math.max(1, positiveCount)) * 100)}%`,
                            }}
                            className="bg-emerald-500 h-full"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic pt-2">
                  ยังไม่มีข้อมูลกิจกรรมที่จับคู่กับอารมณ์บวก
                </p>
              )}
            </div>

            {/* Negative Tags */}
            <div className="border border-rose-200 rounded-2xl p-5 bg-rose-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-rose-950 text-sm flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  กิจกรรมที่มักเกิดคู่กับ "อารมณ์เชิงลบ/ตึงเครียด"
                </h4>
                <span className="text-xs text-rose-700 font-semibold bg-rose-100 px-2 py-0.5 rounded-full">
                  Stress Triggers
                </span>
              </div>
              <p className="text-xs text-gray-500">
                กิจกรรมที่มีความสัมพันธ์กับความเครียด ความกังวล หรือความเหนื่อยล้า
              </p>

              {sortedNegativeTags.length > 0 ? (
                <div className="space-y-2 pt-2">
                  {sortedNegativeTags.map(([tag, count]) => (
                    <div
                      key={tag}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-rose-100 shadow-2xs text-xs"
                    >
                      <span className="font-bold text-gray-800">{tag}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{count} ครั้ง</span>
                        <div className="w-16 bg-rose-100 h-2 rounded-full overflow-hidden">
                          <div
                            style={{
                              width: `${Math.min(100, (count / Math.max(1, negativeCount)) * 100)}%`,
                            }}
                            className="bg-rose-500 h-full"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic pt-2">
                  ยินดีด้วย! ยังไม่พบกิจกรรมที่จับคู่กับอารมณ์เชิงลบในเดือนนี้
                </p>
              )}
            </div>
          </div>

          {/* Mood Insight — Gemini AI summary (สรุปอารมณ์จาก entries) */}
          <div className="border border-indigo-200 rounded-2xl p-5 bg-indigo-50/50 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-indigo-950 text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Mood Insight
              </h4>
              {!isGeminiConfigured() && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                  ยังไม่ได้ตั้งค่าคีย์ AI
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              AI จะประเมินจากข้อมูลเดือนนี้ (วันที่ อารมณ์ คะแนน แฮชแท็ก และโน้ตสั้น สูงสุด 200 ตัวอักษรต่อวัน)
              โดยไม่ส่งรูปภาพที่วาดหรือข้อมูลอื่น
            </p>

            {/* Error banner */}
            {insightError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-semibold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{insightError}</span>
              </div>
            )}

            {/* Generate button */}
            {!insightText && !insightLoading && (
              <button
                type="button"
                onClick={handleGenerateInsight}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                สรุปอารมณ์เดือนนี้
              </button>
            )}

            {/* Loading state */}
            {insightLoading && (
              <div className="flex items-center gap-2.5 text-indigo-700 text-xs font-bold">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังวิเคราะห์แบบแผนอารมณ์ของคุณ... (ใช้เวลาสักครู่)</span>
              </div>
            )}

            {/* Interesting result */}
            {insightText && (
              <div className="space-y-2.5">
                <div className="whitespace-pre-wrap text-[13px] sm:text-sm text-gray-800 leading-relaxed bg-white rounded-2xl border border-indigo-100 p-4 shadow-2xs">
                  {insightText}
                </div>
                <button
                  type="button"
                  onClick={handleGenerateInsight}
                  disabled={insightLoading}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${insightLoading ? 'animate-spin' : ''}`} />
                  ขอสรุปใหม่อีกครั้ง
                </button>
              </div>
            )}

            {/* Disclaimer + crisis hotline (สนับสนุนไม่ใช่การวินิจฉัย) */}
            <div className="flex items-start gap-2 text-[11px] text-gray-500 bg-white/70 border border-indigo-100 rounded-xl p-3">
              <ShieldAlert className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
              <span>
                ผลจาก AI เป็นเพียงแนวทางสังเกตใจและปลอบประโลม ไม่ใช่คำวินิจฉัยหรือคำแนะนำทางการแพทย์
                หากกำลังเป็นทุกข์หนัก โปรดคุยกับผู้เชี่ยวชาญ — สายด่วนสุขภาพจิต 1323 (ฟรี 24 ชม.)
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

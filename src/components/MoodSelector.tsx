import React, { useState } from 'react';
import {
  MOOD_PRESETS,
  MoodPreset,
  MoodCategory,
  SCALE_0_10_LEVELS,
  ScaleMoodLevel,
} from '../types.ts';
import { CanvasDrawer } from './CanvasDrawer.tsx';
import { Edit3, CheckCircle2, Sparkles, SlidersHorizontal, Smile } from 'lucide-react';

interface MoodSelectorProps {
  selectedType: MoodCategory | string;
  selectedScore: number;
  customDrawing?: string;
  onSelectMood: (preset: MoodPreset, customDrawing?: string) => void;
  onSelectScale: (level: ScaleMoodLevel) => void;
}

export const MoodSelector: React.FC<MoodSelectorProps> = ({
  selectedType,
  selectedScore,
  customDrawing,
  onSelectMood,
  onSelectScale,
}) => {
  // Mode switch: 'emoji' vs 'scale'
  const [selectionMode, setSelectionMode] = useState<'emoji' | 'scale'>('emoji');
  const [showCanvasDrawer, setShowCanvasDrawer] = useState(false);

  // Find currently matched scale level (clamped 0 to 10)
  const clampedScore = Math.max(0, Math.min(10, Math.round(selectedScore)));
  const currentScaleLevel =
    SCALE_0_10_LEVELS.find((l) => l.score === clampedScore) || SCALE_0_10_LEVELS[5];

  const handleSelectPreset = (preset: MoodPreset) => {
    if (preset.type === 'custom') {
      setShowCanvasDrawer(true);
    } else {
      setShowCanvasDrawer(false);
      onSelectMood(preset, undefined);
    }
  };

  const handleCanvasSaved = (dataUrl: string) => {
    const customPreset = MOOD_PRESETS.find((p) => p.type === 'custom')!;
    onSelectMood(customPreset, dataUrl);
    setShowCanvasDrawer(false);
  };

  const isCustomActive = selectedType === 'custom' || !!customDrawing;

  return (
    <div className="space-y-4">
      {/* Header and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <label className="block text-sm font-bold text-gray-800">
            ความรู้สึกหลักในวันนี้ <span className="text-red-500">*</span>
          </label>
          <span className="text-xs text-gray-500">
            {selectionMode === 'emoji'
              ? 'เลือก 1 อารมณ์หลัก หรือวาดหน้าตาเอง'
              : 'เลือกระดับคะแนนความรู้สึก 0 (แย่) ถึง 10 (มีความสุข)'}
          </span>
        </div>

        {/* Toggle Mode Switcher (FR: สลับ Mode ระหว่าง emoji กับ 0 ถึง 10) */}
        <div className="inline-flex items-center bg-gray-100/90 p-1 rounded-2xl border border-gray-200 self-start sm:self-auto shadow-2xs">
          <button
            type="button"
            onClick={() => setSelectionMode('emoji')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
              selectionMode === 'emoji'
                ? 'bg-white text-gray-900 shadow-xs ring-1 ring-gray-200/80'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Smile className="w-3.5 h-3.5 text-amber-500" />
            <span>Emoji Mood</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectionMode('scale')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
              selectionMode === 'scale'
                ? 'bg-white text-gray-900 shadow-xs ring-1 ring-gray-200/80'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
            <span>คะแนน 0 - 10</span>
          </button>
        </div>
      </div>

      {/* MODE 1: EMOJI MOOD (Standard Presets + Canvas Drawer) */}
      {selectionMode === 'emoji' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {MOOD_PRESETS.map((preset) => {
              const isSelected = selectedType === preset.type;
              const isCustom = preset.type === 'custom';

              return (
                <button
                  key={preset.type}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  style={{
                    backgroundColor: isSelected ? preset.bgLight : '#FFFFFF',
                    borderColor: isSelected ? preset.borderColor : '#E5E7EB',
                  }}
                  className={`p-3 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between group hover:shadow-md cursor-pointer ${
                    isSelected ? 'ring-2 ring-offset-1 shadow-sm' : 'hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-3xl filter drop-shadow-xs group-hover:scale-110 transition-transform">
                      {isCustom && customDrawing ? (
                        <img
                          src={customDrawing}
                          alt="Custom Drawing"
                          className="w-8 h-8 rounded-full border border-amber-400 object-cover inline-block"
                        />
                      ) : (
                        preset.emoji
                      )}
                    </span>
                    {isSelected && (
                      <CheckCircle2
                        className="w-4 h-4"
                        style={{ color: preset.color }}
                      />
                    )}
                  </div>

                  <div className="mt-2">
                    <div className="font-bold text-xs md:text-sm text-gray-800 flex items-center gap-1">
                      {preset.label}
                    </div>
                    <div className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                      {preset.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* If Canvas Drawer is open */}
          {showCanvasDrawer && (
            <CanvasDrawer
              initialDrawing={customDrawing}
              onSaveDrawing={handleCanvasSaved}
              onCancel={() => setShowCanvasDrawer(false)}
            />
          )}

          {/* If Custom Mood is saved and drawer closed */}
          {!showCanvasDrawer && isCustomActive && customDrawing && (
            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-2xl">
              <div className="flex items-center gap-3">
                <img
                  src={customDrawing}
                  alt="Custom Mood Face"
                  className="w-12 h-12 rounded-full border-2 border-amber-400 bg-white shadow-sm object-cover"
                />
                <div>
                  <p className="text-xs font-semibold text-amber-900">
                    คุณได้เลือกหน้าตาอารมณ์ที่วาดเอง
                  </p>
                  <p className="text-[11px] text-amber-700">
                    ภาพนี้จะถูกบันทึกและแสดงในปฏิทินและขวดโหล
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCanvasDrawer(true)}
                className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl flex items-center gap-1 transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                วาดใหม่
              </button>
            </div>
          )}
        </>
      )}

      {/* MODE 2: 0 TO 10 NUMERIC SCALE (0 = แย่, 10 = มีความสุข) */}
      {selectionMode === 'scale' && (
        <div className="bg-white border-2 border-indigo-100 rounded-3xl p-5 md:p-6 shadow-xs space-y-6">
          {/* Active Level Showcase Card */}
          <div
            style={{
              backgroundColor: currentScaleLevel.bgLight,
              borderColor: currentScaleLevel.borderColor,
            }}
            className="p-4 sm:p-5 rounded-2xl border-2 flex items-center justify-between gap-4 transition-all"
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl sm:text-5xl filter drop-shadow-sm select-none">
                {currentScaleLevel.emoji}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    style={{ backgroundColor: currentScaleLevel.color }}
                    className="px-2.5 py-0.5 rounded-full text-white font-extrabold text-xs shadow-2xs"
                  >
                    ระดับ {currentScaleLevel.score} / 10
                  </span>
                  <span className="text-xs font-bold text-gray-700">
                    {currentScaleLevel.score <= 3
                      ? 'อารมณ์เชิงลบ/ท้าทาย'
                      : currentScaleLevel.score <= 6
                      ? 'อารมณ์ปานกลาง'
                      : 'อารมณ์เชิงบวก/มีความสุข'}
                  </span>
                </div>
                <h3 className="font-extrabold text-gray-900 text-base sm:text-lg mt-1">
                  {currentScaleLevel.label}
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  {currentScaleLevel.description}
                </p>
              </div>
            </div>

            <div className="hidden sm:flex flex-col items-end">
              <span className="text-3xl font-black text-gray-900">
                {currentScaleLevel.score}
              </span>
              <span className="text-[11px] text-gray-500 font-semibold">
                จาก 10 คะแนน
              </span>
            </div>
          </div>

          {/* Scale Guidance legend */}
          <div className="flex items-center justify-between text-xs font-bold px-1">
            <span className="text-red-600 flex items-center gap-1">
              <span>😫</span> 0 = แย่ที่สุด
            </span>
            <span className="text-amber-600 flex items-center gap-1">
              <span>😐</span> 5 = ปานกลาง
            </span>
            <span className="text-emerald-600 flex items-center gap-1">
              10 = มีความสุขมาก <span>🤩</span>
            </span>
          </div>

          {/* Interactive Range Slider */}
          <div className="px-2">
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={clampedScore}
              onChange={(e) => {
                const scoreVal = parseInt(e.target.value, 10);
                const level = SCALE_0_10_LEVELS.find((l) => l.score === scoreVal);
                if (level) onSelectScale(level);
              }}
              className="w-full h-3 bg-linear-to-r from-red-400 via-amber-400 to-emerald-500 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-hidden"
            />
          </div>

          {/* Clickable Number Pills 0 to 10 */}
          <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5 sm:gap-2 pt-1">
            {SCALE_0_10_LEVELS.map((level) => {
              const isSelected = clampedScore === level.score;
              return (
                <button
                  key={level.score}
                  type="button"
                  onClick={() => onSelectScale(level)}
                  style={{
                    backgroundColor: isSelected ? level.color : '#F9FAFB',
                    color: isSelected ? '#FFFFFF' : '#374151',
                    borderColor: isSelected ? level.color : '#E5E7EB',
                  }}
                  className={`py-2 sm:py-3 rounded-xl border font-black text-xs sm:text-sm flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-indigo-300 ring-offset-1 scale-105 shadow-sm'
                      : 'hover:bg-gray-100 hover:border-gray-300 active:scale-95'
                  }`}
                  title={level.label}
                >
                  <span className="text-sm font-black">{level.score}</span>
                  <span className="text-xs">
                    {level.emoji}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-center text-gray-500 pt-1">
            แตะตัวเลข 0 ถึง 10 หรือเลื่อนแถบสไลด์เพื่อปรับระดับคะแนนความสุขประจำวัน
          </p>
        </div>
      )}
    </div>
  );
};

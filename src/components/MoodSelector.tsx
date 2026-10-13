import React, { useEffect, useState } from 'react';
import {
  MOOD_PRESETS,
  MoodPreset,
  MoodCategory,
  SCALE_0_10_LEVELS,
  ScaleMoodLevel,
} from '../types.ts';
import { CanvasDrawer } from './CanvasDrawer.tsx';
import {
  Edit3,
  CheckCircle2,
  SlidersHorizontal,
  Smile,
  X as XIcon,
  ChevronDown,
} from 'lucide-react';

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
  const [showModal, setShowModal] = useState(false);
  const [showCanvasDrawer, setShowCanvasDrawer] = useState(false);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (showModal) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [showModal]);

  // Find currently matched scale level (clamped 0 to 10)
  const clampedScore = Math.max(0, Math.min(10, Math.round(selectedScore)));
  const currentScaleLevel =
    SCALE_0_10_LEVELS.find((l) => l.score === clampedScore) || SCALE_0_10_LEVELS[5];

  const selectedPreset =
    MOOD_PRESETS.find((p) => p.type === selectedType) || MOOD_PRESETS[0];

  const isCustomActive = selectedType === 'custom' || !!customDrawing;
  const isEmojiMode = selectionMode === 'emoji';

  const handleSelectPreset = (preset: MoodPreset) => {
    if (preset.type === 'custom') {
      setShowCanvasDrawer(true);
    } else {
      setShowCanvasDrawer(false);
      onSelectMood(preset, undefined);
      setShowModal(false);
    }
  };

  const handleCanvasSaved = (dataUrl: string) => {
    const customPreset = MOOD_PRESETS.find((p) => p.type === 'custom')!;
    // Keep the currently chosen score for the new drawing
    onSelectMood({ ...customPreset, score: clampedScore }, dataUrl);
    setShowCanvasDrawer(false);
  };

  // Pick a 0-10 score for the custom drawn mood
  const handleCustomScoreSelect = (level: ScaleMoodLevel) => {
    const customPreset = MOOD_PRESETS.find((p) => p.type === 'custom')!;
    onSelectMood(
      {
        ...customPreset,
        score: level.score,
        color: level.color,
        bgLight: level.bgLight,
        borderColor: level.borderColor,
      },
      customDrawing
    );
    setShowModal(false);
  };

  const handleScaleLevelSelect = (level: ScaleMoodLevel) => {
    onSelectScale(level);
    setShowModal(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setShowCanvasDrawer(false);
  };

  // Compact display values (what the single card always shows)
  const isCustomSelected = isEmojiMode && isCustomActive && !!customDrawing;
  const displayEmoji = isEmojiMode ? selectedPreset.emoji : currentScaleLevel.emoji;
  const displayLabel = isEmojiMode ? selectedPreset.label : currentScaleLevel.label;
  const displayColor = isEmojiMode ? selectedPreset.color : currentScaleLevel.color;
  const displayBg = isEmojiMode ? selectedPreset.bgLight : currentScaleLevel.bgLight;
  const displayBorder = isEmojiMode ? selectedPreset.borderColor : currentScaleLevel.borderColor;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <label className="block text-sm font-bold text-gray-800">
          ความรู้สึกหลักในวันนี้ <span className="text-red-500">*</span>
        </label>
        <span className="text-xs text-gray-500">
          แตะการ์ดด้านล่างเพื่อเลือกอารมณ์หรือคะแนน
        </span>
      </div>

      {/* Single compact card showing the current selection only */}
      <button
        type="button"
        onClick={() => {
          setShowModal(true);
          setShowCanvasDrawer(false);
        }}
        style={{
          backgroundColor: displayBg,
          borderColor: displayBorder,
        }}
        className="w-full p-4 rounded-2xl border-2 flex items-center gap-3.5 text-left transition-all hover:shadow-md cursor-pointer"
      >
        {isCustomSelected ? (
          <img
            src={customDrawing}
            alt="Custom Drawing"
            className="w-11 h-11 rounded-full border-2 border-amber-400 bg-white object-cover shrink-0"
          />
        ) : (
          <span className="text-4xl filter drop-shadow-xs select-none shrink-0">
            {displayEmoji}
          </span>
        )}

        <div className="flex-1 min-w-0">
          {(!isEmojiMode || isCustomSelected) && (
            <span
              style={{ backgroundColor: displayColor }}
              className="inline-block px-2 py-0.5 rounded-full text-white font-extrabold text-[11px] shadow-2xs mb-1"
            >
              {clampedScore} / 10
            </span>
          )}
          <div className="font-bold text-sm md:text-base text-gray-900 truncate">
            {isCustomSelected ? 'หน้าตาที่วาดเอง' : displayLabel}
          </div>
          <div className="text-[11px] text-gray-600 mt-0.5 flex items-center gap-1">
            <span className="hidden sm:inline">
              แตะเพื่อเปลี่ยน{isEmojiMode ? 'อารมณ์' : 'ระดับคะแนน'}
            </span>
            <span className="sm:hidden">
              แตะเพื่อเปลี่ยน{isEmojiMode ? 'อารมณ์' : 'คะแนน'}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 shrink-0 text-gray-500">
          <Edit3 className="w-4 h-4" />
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>

      {/* Selection Modal (opens when card is tapped) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCloseModal}
            aria-hidden="true"
          />

          {/* Modal Panel */}
          <div
            role="dialog"
            aria-modal="true"
            className="relative bg-white w-full sm:max-w-2xl max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl p-4 sm:p-6"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                  เลือกความรู้สึกหลักในวันนี้
                </h3>
                <span className="text-xs text-gray-500">
                  {isEmojiMode
                    ? 'เลือก 1 อารมณ์หลัก หรือวาดหน้าตาเอง'
                    : 'เลือกระดับคะแนนความรู้สึก 0 (แย่) ถึง 10 (มีความสุข)'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition cursor-pointer shrink-0"
                aria-label="ปิดหน้าเลือกอารมณ์"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Toggle Mode Switcher (FR: สลับ Mode ระหว่าง emoji กับ 0 ถึง 10) */}
            <div className="flex mt-3">
              <div className="inline-flex items-center bg-gray-100/90 p-1 rounded-2xl border border-gray-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    setSelectionMode('emoji');
                    setShowCanvasDrawer(false);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isEmojiMode
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
                    !isEmojiMode
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
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {MOOD_PRESETS.map((preset) => {
                    const isSelected = selectedType === preset.type && !isCustomActive;
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

                {/* If Canvas Drawer is open (inside modal) */}
                {showCanvasDrawer && (
                  <CanvasDrawer
                    initialDrawing={customDrawing}
                    onSaveDrawing={handleCanvasSaved}
                    onCancel={() => setShowCanvasDrawer(false)}
                  />
                )}

                {/* If Custom Mood is saved and drawer closed: pick its score */}
                {!showCanvasDrawer && isCustomActive && customDrawing && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={customDrawing}
                          alt="Custom Mood Face"
                          className="w-12 h-12 rounded-full border-2 border-amber-400 bg-white shadow-sm object-cover shrink-0"
                        />
                        <div>
                          <p className="text-xs font-semibold text-amber-900">
                            อารมณ์ที่วาดเอง — เลือกคะแนนของวันนี้ (0 - 10)
                          </p>
                          <p className="text-[11px] text-amber-700">
                            กำลังเลือก {clampedScore} / 10 ภาพวาดจะแสดงในปฏิทินและขวดโหล
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCanvasDrawer(true)}
                        className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl flex items-center gap-1 transition shrink-0"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        วาดใหม่
                      </button>
                    </div>

                    {/* Score pills 0 to 10 for the drawn mood */}
                    <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5 sm:gap-2">
                      {SCALE_0_10_LEVELS.map((level) => {
                        const isSelected = clampedScore === level.score;
                        return (
                          <button
                            key={level.score}
                            type="button"
                            onClick={() => handleCustomScoreSelect(level)}
                            style={{
                              backgroundColor: isSelected ? level.color : '#FFFFFF',
                              color: isSelected ? '#FFFFFF' : '#374151',
                              borderColor: isSelected ? level.color : '#FDE68A',
                            }}
                            className={`py-2 rounded-xl border font-black text-xs flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'ring-2 ring-amber-300 ring-offset-1 shadow-sm scale-105'
                                : 'hover:bg-white hover:border-amber-300 active:scale-95'
                            }`}
                            title={level.label}
                          >
                            <span className="text-xs font-black">{level.score}</span>
                            <span className="text-[11px]">{level.emoji}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-center text-amber-700/80">
                      แตะตัวเลข 0 - 10 เพื่อกำหนดคะแนนความรู้สึกของหน้าตาที่วาด แล้วปิด modal ทันที
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* MODE 2: 0 TO 10 NUMERIC SCALE (0 = แย่, 10 = มีความสุข) */}
            {selectionMode === 'scale' && (
              <div className="mt-4 bg-white border-2 border-indigo-100 rounded-3xl p-4 sm:p-5 shadow-xs space-y-5">
                {/* Active Level Showcase Card */}
                <div
                  style={{
                    backgroundColor: currentScaleLevel.bgLight,
                    borderColor: currentScaleLevel.borderColor,
                  }}
                  className="p-3.5 sm:p-4 rounded-2xl border-2 flex items-center justify-between gap-3 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl sm:text-4xl filter drop-shadow-sm select-none shrink-0">
                      {currentScaleLevel.emoji}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
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
                      <h3 className="font-extrabold text-gray-900 text-sm sm:text-base mt-1">
                        {currentScaleLevel.label}
                      </h3>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
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
                        onClick={() => handleScaleLevelSelect(level)}
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

                <p className="text-[11px] text-center text-gray-500">
                  เลื่อนแถบสไลด์เพื่อปรับระดับ (ปิดแล้วคงคะแนนปัจจุบัน) หรือแตะตัวเลขเพื่อเลือกทันที
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

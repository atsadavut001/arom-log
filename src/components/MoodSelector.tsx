import React, { useEffect, useState, useRef } from 'react';
import {
  MOOD_PRESETS,
  MoodPreset,
  MoodCategory,
  SCALE_0_10_LEVELS,
  ScaleMoodLevel,
} from '../types.ts';
import { CanvasDrawer } from './CanvasDrawer.tsx';
import {
  Smile,
  SlidersHorizontal,
  Palette,
  Edit3,
  X,
  Check,
} from 'lucide-react';

interface MoodSelectorProps {
  selectedType: MoodCategory | string;
  selectedScore: number;
  customDrawing?: string;
  onSelectMood: (preset: MoodPreset, customDrawing?: string) => void;
  onSelectScale: (level: ScaleMoodLevel) => void;
  autoOpenModal?: boolean;
}

export const MoodSelector: React.FC<MoodSelectorProps> = ({
  selectedType,
  selectedScore,
  customDrawing,
  onSelectMood,
  onSelectScale,
  autoOpenModal = false,
}) => {
  // Modal 1 (Clock dial modal) visibility
  const [showModal, setShowModal] = useState<boolean>(!!autoOpenModal);
  const autoOpenedRef = useRef<boolean>(!!autoOpenModal);

  // Auto-open if autoOpenModal switches to true after mount
  useEffect(() => {
    if (autoOpenModal && !autoOpenedRef.current) {
      setShowModal(true);
      autoOpenedRef.current = true;
    }
  }, [autoOpenModal]);
  // Modal 2 (Custom drawing & score rating modal) visibility
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  // Mode switch inside clock: 'emoji' vs 'scale'
  const [selectionMode, setSelectionMode] = useState<'emoji' | 'scale'>('emoji');

  // Find currently matched scale level (clamped 0 to 10)
  const clampedScore = Math.max(0, Math.min(10, Math.round(selectedScore)));
  const [customScore, setCustomScore] = useState<number>(clampedScore || 5);

  // Sync customScore when selectedScore or modal opens
  useEffect(() => {
    if (selectedScore !== undefined) {
      setCustomScore(Math.max(0, Math.min(10, Math.round(selectedScore))));
    }
  }, [selectedScore, showCustomModal]);

  // Lock body scroll while any modal is open
  useEffect(() => {
    if (showModal || showCustomModal) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [showModal, showCustomModal]);

  const currentScaleLevel =
    SCALE_0_10_LEVELS.find((l) => l.score === clampedScore) || SCALE_0_10_LEVELS[5];

  const selectedPreset =
    MOOD_PRESETS.find((p) => p.type === selectedType) || MOOD_PRESETS[0];

  const isCustomActive = selectedType === 'custom' || !!customDrawing;
  const isEmojiMode = selectionMode === 'emoji';

  const handleSelectPreset = (preset: MoodPreset) => {
    if (preset.type === 'custom') {
      const customPreset = MOOD_PRESETS.find((p) => p.type === 'custom')!;
      onSelectMood(customPreset, customDrawing);
    } else {
      onSelectMood(preset, undefined);
    }
  };

  const handleDoneClockModal = () => {
    if (selectedType === 'custom' || (selectionMode === 'emoji' && isCustomActive)) {
      setShowModal(false);
      setShowCustomModal(true);
    } else {
      setShowModal(false);
    }
  };

  const handleCanvasSaved = (dataUrl: string, chosenScore?: number) => {
    const finalScore = chosenScore !== undefined ? chosenScore : customScore;
    const scaleLevel =
      SCALE_0_10_LEVELS.find((l) => l.score === finalScore) || SCALE_0_10_LEVELS[5];
    const customPreset = MOOD_PRESETS.find((p) => p.type === 'custom')!;
    onSelectMood(
      {
        ...customPreset,
        score: finalScore,
        color: scaleLevel.color,
        bgLight: scaleLevel.bgLight,
        borderColor: scaleLevel.borderColor,
      },
      dataUrl
    );
    setShowCustomModal(false);
  };

  const handleSelectScale = (level: ScaleMoodLevel) => {
    onSelectScale(level);
  };

  // Determine current active index & angle for the clock hand pointer
  let selectedAngle = -90; // Default 12 o'clock
  let displayColor = selectedPreset.color;

  if (isEmojiMode) {
    const activeIdx = isCustomActive
      ? MOOD_PRESETS.findIndex((p) => p.type === 'custom')
      : MOOD_PRESETS.findIndex((p) => p.type === selectedType);
    const validIdx = activeIdx >= 0 ? activeIdx : 0;
    selectedAngle = (validIdx * 360) / MOOD_PRESETS.length - 90;
    displayColor = selectedPreset.color;
  } else {
    const activeIdx = SCALE_0_10_LEVELS.findIndex((l) => l.score === clampedScore);
    const validIdx = activeIdx >= 0 ? activeIdx : 5;
    selectedAngle = (validIdx * 360) / SCALE_0_10_LEVELS.length - 90;
    displayColor = currentScaleLevel.color;
  }

  // Radians for SVG clock hand tip
  const handRad = (selectedAngle * Math.PI) / 180;
  const handLengthPercent = 28; // Distance from center 50%
  const handX = 50 + handLengthPercent * Math.cos(handRad);
  const handY = 50 + handLengthPercent * Math.sin(handRad);

  return (
    <div className="space-y-2 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-bold text-gray-800">
          ความรู้สึกหลักในวันนี้ <span className="text-red-500">*</span>
        </label>
        <span className="text-xs text-gray-500">แตะการ์ดเพื่อเปลี่ยน</span>
      </div>

      {/* ========================================================= */}
      {/* 1. COMPACT CARD ON FORM (แสดงเฉพาะ Emoji หรือ คะแนนที่เลือก) */}
      {/* ========================================================= */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        style={{
          backgroundColor: isCustomActive
            ? '#FFFBEB'
            : selectedPreset.bgLight || '#FEF3C7',
          borderColor: isCustomActive
            ? '#FCD34D'
            : selectedPreset.borderColor || '#FCD34D',
        }}
        className="w-full p-3.5 sm:p-4 rounded-2xl border-2 flex items-center justify-between gap-3 text-left transition-all hover:shadow-md cursor-pointer group active:scale-[0.99]"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Leading Emoji / Drawing / Score Badge */}
          {isCustomActive && customDrawing ? (
            <img
              src={customDrawing}
              alt="Custom Drawing"
              className="w-13 h-13 sm:w-15 sm:h-15 rounded-full border-2 border-amber-400 bg-white object-cover shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
            />
          ) : selectedPreset.emojiUrl ? (
            <img
              src={selectedPreset.emojiUrl}
              alt={selectedPreset.label}
              className="w-13 h-13 sm:w-15 sm:h-15 object-contain shrink-0 filter drop-shadow-xs group-hover:scale-105 transition-transform"
            />
          ) : (
            <span className="text-4xl sm:text-5xl shrink-0 leading-none">
              {selectedPreset.emoji}
            </span>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg text-gray-900 truncate">
                {isCustomActive && customDrawing
                  ? 'หน้าตาที่วาดเอง'
                  : selectedPreset.label}
              </span>
              <span
                style={{ backgroundColor: selectedPreset.color }}
                className="px-2 py-0.5 rounded-full text-white font-extrabold text-[11px] shadow-2xs shrink-0"
              >
                {clampedScore} / 10
              </span>
            </div>
            <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">
              {isCustomActive
                ? 'วาดหน้าตาแสดงอารมณ์ของคุณเอง'
                : selectedPreset.description}
            </p>
          </div>
        </div>

        {/* Change button chip */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 group-hover:bg-white text-gray-700 group-hover:text-amber-800 border border-gray-200/80 group-hover:border-amber-300 text-xs font-bold transition shadow-2xs shrink-0">
          <Edit3 className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden xs:inline">เปลี่ยน</span>
        </div>
      </button>

      {/* ========================================================= */}
      {/* 2. CLOCK FACE DIAL MODAL (เปิดเมื่อผู้ใช้กดที่การ์ด)        */}
      {/* ========================================================= */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-3xl p-4 sm:p-6 max-w-[430px] w-full shadow-2xl border border-gray-100 max-h-[95dvh] overflow-y-auto flex flex-col items-center animate-in zoom-in-95 duration-150 my-auto"
          >
            {/* Modal Header */}
            <div className="w-full flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  เลือกความรู้สึกหลักในวันนี้
                </h3>
                <p className="text-[11px] text-gray-500">
                  แตะเลือกบนหน้าปัดนาฬิกา หรือแตะตรงกลางเพื่อสลับโหมด
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                title="ปิด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CLOCK FACE DIAL (Responsive, Mobile-first) */}
            <div className="relative w-full py-4 flex items-center justify-center">
              <div className="relative w-[295px] h-[295px] xs:w-[325px] xs:h-[325px] sm:w-[365px] sm:h-[365px] rounded-full bg-linear-to-b from-stone-50/90 via-amber-50/30 to-orange-50/50 shadow-md touch-manipulation flex items-center justify-center transition-all">
                {/* Clock Background and Animated Hand SVG */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none rounded-full"
                  viewBox="0 0 100 100"
                >
                  {/* Smooth animated clock hand */}
                  <line
                    x1="50"
                    y1="50"
                    x2={handX}
                    y2={handY}
                    stroke={displayColor}
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    className="transition-all duration-300 ease-out"
                  />
                  {/* Clock hand tip dot */}
                  <circle
                    cx={handX}
                    cy={handY}
                    r="2.6"
                    fill={displayColor}
                    className="transition-all duration-300 ease-out"
                  />
                </svg>

                {/* ========================================================= */}
                {/* CLOCK DIAL: EMOJI MOOD (15 Items Around the Perimeter)     */}
                {/* ========================================================= */}
                {isEmojiMode && (
                  <div className="absolute inset-0 animate-in fade-in zoom-in-95 duration-200">
                    {MOOD_PRESETS.map((preset, index) => {
                      const total = MOOD_PRESETS.length;
                      const angle = (index * 360) / total - 90;
                      const rad = (angle * Math.PI) / 180;
                      const x = 50 + 38.5 * Math.cos(rad);
                      const y = 50 + 38.5 * Math.sin(rad);

                      const isCustom = preset.type === 'custom';
                      const isSelected = isCustom
                        ? isCustomActive
                        : selectedType === preset.type && !isCustomActive;

                      return (
                        <button
                          key={preset.type}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          style={{
                            left: `${x}%`,
                            top: `${y}%`,
                            backgroundColor: isSelected ? preset.bgLight : '#FFFFFF',
                            borderColor: isSelected ? preset.color : '#E5E7EB',
                          }}
                          title={preset.label}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-200 cursor-pointer flex items-center justify-center select-none active:scale-95 ${
                            isSelected
                              ? 'w-10.5 h-10.5 xs:w-11.5 xs:h-11.5 sm:w-13 sm:h-13 shadow-md scale-115 z-20 ring-2 ring-offset-1'
                              : 'w-8.5 h-8.5 xs:w-9.5 xs:h-9.5 sm:w-11 sm:h-11 shadow-2xs hover:scale-115 hover:border-amber-300 z-10'
                          }`}
                        >
                          {isCustom ? (
                            customDrawing ? (
                              <img
                                src={customDrawing}
                                alt="Custom Drawing"
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <Palette className="w-4 h-4 xs:w-5 xs:h-5 text-orange-500 shrink-0" />
                            )
                          ) : preset.emojiUrl ? (
                            <img
                              src={preset.emojiUrl}
                              alt={preset.label}
                              className="w-6.5 h-6.5 xs:w-7.5 xs:h-7.5 sm:w-8.5 sm:h-8.5 object-contain pointer-events-none filter drop-shadow-2xs"
                            />
                          ) : (
                            <span className="text-base xs:text-lg sm:text-xl leading-none">
                              {preset.emoji}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* ========================================================= */}
                {/* CLOCK DIAL: SCORE 0-10 (11 Items Around the Perimeter)     */}
                {/* ========================================================= */}
                {!isEmojiMode && (
                  <div className="absolute inset-0 animate-in fade-in zoom-in-95 duration-200">
                    {SCALE_0_10_LEVELS.map((level, index) => {
                      const total = SCALE_0_10_LEVELS.length;
                      const angle = (index * 360) / total - 90;
                      const rad = (angle * Math.PI) / 180;
                      const x = 50 + 38.5 * Math.cos(rad);
                      const y = 50 + 38.5 * Math.sin(rad);

                      const isSelected = clampedScore === level.score;

                      return (
                        <button
                          key={level.score}
                          type="button"
                          onClick={() => handleSelectScale(level)}
                          style={{
                            left: `${x}%`,
                            top: `${y}%`,
                            backgroundColor: isSelected ? level.color : '#FFFFFF',
                            borderColor: isSelected ? level.color : '#E5E7EB',
                            color: isSelected ? '#FFFFFF' : '#374151',
                          }}
                          title={level.label}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-200 cursor-pointer flex items-center justify-center select-none active:scale-95 font-extrabold ${
                            isSelected
                              ? 'w-10.5 h-10.5 xs:w-11.5 xs:h-11.5 sm:w-13 sm:h-13 shadow-md scale-115 z-20 ring-2 ring-offset-1 text-white text-xs xs:text-sm sm:text-base'
                              : 'w-8.5 h-8.5 xs:w-9.5 xs:h-9.5 sm:w-11 sm:h-11 shadow-2xs hover:scale-115 hover:border-amber-300 z-10 text-[11px] xs:text-xs sm:text-sm'
                          }`}
                        >
                          <span>{level.score}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* ========================================================= */}
                {/* CENTER HUB: Displays active item + MODE SWITCH BUTTON     */}
                {/* ========================================================= */}
                <div className="relative z-30 w-[126px] h-[126px] xs:w-[140px] xs:h-[140px] sm:w-[165px] sm:h-[165px] rounded-full bg-white/95 backdrop-blur-md shadow-md flex flex-col items-center justify-center p-2 text-center transition-all">
                  {/* Current Active Preview */}
                  {isEmojiMode ? (
                    <div className="flex flex-col items-center justify-center -mt-0.5">
                      {isCustomActive && customDrawing ? (
                        <div
                          onClick={() => {
                            setShowModal(false);
                            setShowCustomModal(true);
                          }}
                          className="relative group cursor-pointer"
                          title="แตะเพื่อแก้ไขภาพวาด"
                        >
                          <img
                            src={customDrawing}
                            alt="หน้าตาที่วาดเอง"
                            className="w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 rounded-full border-2 border-amber-400 object-cover shadow-2xs group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute -bottom-1 -right-1 p-0.5 bg-amber-500 text-white rounded-full text-[9px] shadow-xs">
                            <Edit3 className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      ) : selectedPreset.emojiUrl ? (
                        <img
                          src={selectedPreset.emojiUrl}
                          alt={selectedPreset.label}
                          className="w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 object-contain filter drop-shadow-xs"
                        />
                      ) : (
                        <span className="text-4xl xs:text-5xl">{selectedPreset.emoji}</span>
                      )}

                      <div className="font-extrabold text-xs sm:text-sm text-gray-900 mt-0.5 line-clamp-1 max-w-[115px] sm:max-w-[145px]">
                        {isCustomActive && customDrawing ? 'หน้าตาที่วาดเอง' : selectedPreset.label}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center -mt-0.5">
                      <div className="flex items-baseline gap-0.5">
                        <span
                          style={{ color: currentScaleLevel.color }}
                          className="text-3xl xs:text-4xl sm:text-5xl font-black"
                        >
                          {currentScaleLevel.score}
                        </span>
                        <span className="text-[11px] sm:text-xs font-bold text-gray-400">/ 10</span>
                      </div>
                      <div className="font-bold text-[11px] sm:text-xs text-gray-800 line-clamp-1 max-w-[115px] sm:max-w-[145px]">
                        {currentScaleLevel.label.replace(/^\d+\/10\s*-\s*/, '')}
                      </div>
                    </div>
                  )}

                  {/* Mode Switch Button in Center */}
                  <button
                    type="button"
                    onClick={() => setSelectionMode(isEmojiMode ? 'scale' : 'emoji')}
                    className="mt-1 flex items-center gap-1 px-2.5 py-1 rounded-full bg-linear-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-950 border border-amber-300 transition active:scale-95 shadow-2xs cursor-pointer select-none"
                    title={isEmojiMode ? 'สลับไปยังหน้าปัดคะแนน 0-10' : 'สลับไปยังหน้าปัด Emoji Mood'}
                  >
                    {isEmojiMode ? (
                      <>
                        <SlidersHorizontal className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span className="text-[10px] font-bold">สลับเป็น 0-10</span>
                      </>
                    ) : (
                      <>
                        <Smile className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="text-[10px] font-bold">สลับเป็น Emoji</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Done Button */}
            <button
              type="button"
              onClick={handleDoneClockModal}
              className="mt-2 w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white text-sm font-bold transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>เสร็จสิ้น</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MODAL 2: DRAWING CANVAS & SCORE RATING                */}
      {/* (เปิดหลังจากกดเสร็จสิ้นใน Modal 1 เมื่อเลือก 'วาดเอง')    */}
      {/* ========================================================= */}
      {showCustomModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setShowCustomModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-3xl p-3 sm:p-5 max-w-[440px] w-full shadow-2xl border border-gray-100 max-h-[95dvh] overflow-y-auto flex flex-col animate-in zoom-in-95 duration-150 my-auto"
          >
            {/* Modal 2 Header */}
            <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                  วาดหน้าตา & ให้คะแนนอารมณ์
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                title="ปิด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <CanvasDrawer
              initialDrawing={customDrawing}
              score={customScore}
              onScoreChange={setCustomScore}
              onSaveDrawing={handleCanvasSaved}
              onBack={() => {
                setShowCustomModal(false);
                setShowModal(true);
              }}
              confirmButtonText="เสร็จสิ้น"
            />
          </div>
        </div>
      )}
    </div>
  );
};

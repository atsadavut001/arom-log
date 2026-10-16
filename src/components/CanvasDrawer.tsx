import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Pen, RotateCcw, Trash2, Check, Sparkles, Scissors, ChevronLeft } from 'lucide-react';
import { SCALE_0_10_LEVELS } from '../types.ts';

interface CanvasDrawerProps {
  initialDrawing?: string;
  onSaveDrawing: (dataUrl: string, score?: number) => void;
  onCancel?: () => void;
  onShredDraft?: (dataUrl?: string) => void;
  // Mood flow: score rating & back navigation
  score?: number;
  onScoreChange?: (score: number) => void;
  onBack?: () => void;
  confirmButtonText?: string;
}

const BRUSH_COLORS = [
  '#1E293B', // Charcoal
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F97316', // Orange
];

export const CanvasDrawer: React.FC<CanvasDrawerProps> = ({
  initialDrawing,
  onSaveDrawing,
  onCancel,
  onShredDraft,
  score,
  onScoreChange,
  onBack,
  confirmButtonText,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState<string>('#1E293B');
  const [brushWidth, setBrushWidth] = useState<number>(4);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);

  // Find currently matched scale level if score is provided
  const clampedScore = score !== undefined ? Math.max(0, Math.min(10, Math.round(score))) : 5;
  const currentScaleLevel =
    SCALE_0_10_LEVELS.find((l) => l.score === clampedScore) || SCALE_0_10_LEVELS[5];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = 280;
    canvas.height = 280;

    // Default white background with subtle yellow mood circle
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (initialDrawing) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        saveState();
      };
      img.src = initialDrawing;
    } else {
      // Draw a friendly cute face guide circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(140, 140, 115, 0, Math.PI * 2);
      ctx.fillStyle = '#FEF3C7';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#FCD34D';
      ctx.stroke();
      ctx.restore();
      saveState();
    }
  }, []);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(0, historyStep + 1), imageData]);
    setHistoryStep((prev) => prev + 1);
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = isEraser ? '#FEF3C7' : currentColor;
    ctx.lineWidth = brushWidth;
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveState();
  };

  const handleUndo = () => {
    if (historyStep <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prevIndex = historyStep - 1;
    ctx.putImageData(history[prevIndex], 0, 0);
    setHistoryStep(prevIndex);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.beginPath();
    ctx.arc(140, 140, 115, 0, Math.PI * 2);
    ctx.fillStyle = '#FEF3C7';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FCD34D';
    ctx.stroke();
    ctx.restore();

    saveState();
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png', 0.85);
    onSaveDrawing(dataUrl, score);
  };

  return (
    <div className="bg-amber-50/70 border border-amber-200/80 rounded-3xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-600" />
          <h4 className="font-semibold text-gray-800 text-sm md:text-base">
            วาดหน้าตาอารมณ์ของคุณวันนี้ (Custom Canvas)
          </h4>
        </div>
        <span className="text-xs text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-full font-medium">
          อิสระไม่มีถูกผิด
        </span>
      </div>

      {/* Canvas Frame */}
      <div className="flex justify-center">
        <div className="relative rounded-2xl p-2 bg-white shadow-inner border-2 border-dashed border-amber-300">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-[260px] h-[260px] md:w-[280px] md:h-[280px] rounded-xl cursor-crosshair touch-none select-none bg-white"
          />
        </div>
      </div>

      {/* Controls Bar */}
      <div className="space-y-3">
        {/* Colors */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {BRUSH_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                setCurrentColor(color);
                setIsEraser(false);
              }}
              style={{ backgroundColor: color }}
              className={`w-7 h-7 rounded-full transition-transform ${
                !isEraser && currentColor === color
                  ? 'ring-4 ring-amber-300 scale-110 shadow'
                  : 'hover:scale-105 opacity-90'
              }`}
              title={`สี ${color}`}
            />
          ))}
        </div>

        {/* Tools and Brush Sizes */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
          {/* Pen / Eraser */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setIsEraser(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                !isEraser
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Pen className="w-3.5 h-3.5" />
              ปากกา
            </button>
            <button
              type="button"
              onClick={() => setIsEraser(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                isEraser
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              ยางลบ
            </button>
          </div>

          {/* Width */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-1">
            {[3, 6, 12].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setBrushWidth(size)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition ${
                  brushWidth === size
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span
                  style={{ width: `${size + 2}px`, height: `${size + 2}px` }}
                  className="rounded-full bg-current"
                />
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyStep <= 0}
              className="p-2 text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition"
              title="ย้อนกลับ (Undo)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-2 text-red-600 bg-white border border-gray-200 rounded-xl hover:bg-red-50 transition"
              title="ล้างทั้งหมด"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Optional Mood Score Rating bar (0 - 10) */}
        {score !== undefined && onScoreChange && (
          <div className="space-y-2 pt-3 border-t border-amber-200/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-800">
                  ให้คะแนนอารมณ์นี้ (0 - 10)
                </span>
                <span
                  style={{ backgroundColor: currentScaleLevel.color }}
                  className="px-2 py-0.5 rounded-full text-white text-[11px] font-black shadow-2xs"
                >
                  {clampedScore} / 10
                </span>
              </div>
              <span className="text-[11px] font-semibold text-gray-600 truncate max-w-[150px]">
                {currentScaleLevel.label.replace(/^\d+\/10\s*-\s*/, '')}
              </span>
            </div>

            {/* Quick Click Number Pills 0 to 10 */}
            <div className="grid grid-cols-6 sm:grid-cols-11 gap-1">
              {SCALE_0_10_LEVELS.map((level) => {
                const isSelected = clampedScore === level.score;
                return (
                  <button
                    key={level.score}
                    type="button"
                    onClick={() => onScoreChange(level.score)}
                    style={{
                      backgroundColor: isSelected ? level.color : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : '#374151',
                      borderColor: isSelected ? level.color : '#E5E7EB',
                    }}
                    className={`py-1.5 rounded-xl border text-xs font-black transition cursor-pointer flex items-center justify-center select-none ${
                      isSelected
                        ? 'ring-2 ring-offset-1 shadow-xs scale-105'
                        : 'hover:bg-gray-100 hover:border-gray-300 active:scale-95'
                    }`}
                    title={level.label}
                  >
                    <span>{level.score}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons: Back + Done */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-amber-200/70">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 text-xs md:text-sm font-bold text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4 text-stone-500" />
              <span>ย้อนกลับ</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {onShredDraft && (
              <button
                type="button"
                onClick={() => {
                  const canvas = canvasRef.current;
                  const dataUrl = canvas ? canvas.toDataURL('image/png') : undefined;
                  onShredDraft(dataUrl);
                }}
                className="px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="เอาโพสที่ยังไม่โพสเข้าเครื่องบด"
              >
                <Scissors className="w-3.5 h-3.5 text-rose-600" />
                <span>บดทิ้ง</span>
              </button>
            )}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition"
              >
                ยกเลิก
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              className="px-6 py-2.5 text-xs md:text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 active:scale-95 rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{confirmButtonText || 'เสร็จสิ้น'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

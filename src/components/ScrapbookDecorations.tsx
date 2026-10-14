import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Trash2,
  Move,
  Plus,
  Pencil,
  Palette,
  Check,
} from 'lucide-react';

export interface FreeScrapbookItem {
  id: string;
  type: 'sticker' | 'tape' | 'stamp';
  content: string; // text, emoji, or preset key
  color?: string; // style / color preset
  x: number; // percentage 0-100% of container width
  y: number; // percentage 0-100% of container height
  scale: number; // scale multiplier (0.4 to 3.0)
  rotation: number; // rotation in degrees (-180 to 180)
}

export interface WashiTapePreset {
  id: string;
  name: string;
  className: string;
  patternStyle?: React.CSSProperties;
}

export const WASHI_TAPE_PRESETS: WashiTapePreset[] = [
  {
    id: 'kraft',
    name: 'คราฟท์วินเทจ',
    className: 'bg-amber-200/90 border-t border-b border-amber-300/80 shadow-xs text-amber-900',
    patternStyle: {
      backgroundImage:
        'repeating-linear-gradient(45deg, rgba(180,83,9,0.08) 0, rgba(180,83,9,0.08) 3px, transparent 3px, transparent 6px)',
    },
  },
  {
    id: 'pastel-gingham',
    name: 'ตารางพาสเทล',
    className: 'bg-rose-100/95 border-t border-b border-rose-200 shadow-xs text-rose-900',
    patternStyle: {
      backgroundImage:
        'repeating-linear-gradient(0deg, rgba(244,63,94,0.12) 0, rgba(244,63,94,0.12) 4px, transparent 4px, transparent 8px), repeating-linear-gradient(90deg, rgba(244,63,94,0.12) 0, rgba(244,63,94,0.12) 4px, transparent 4px, transparent 8px)',
    },
  },
  {
    id: 'mint-dots',
    name: 'มินต์โพลก้าดอท',
    className: 'bg-emerald-100/95 border-t border-b border-emerald-200 shadow-xs text-emerald-900',
    patternStyle: {
      backgroundImage: 'radial-gradient(circle, rgba(16,185,129,0.25) 1.5px, transparent 1.5px)',
      backgroundSize: '8px 8px',
    },
  },
  {
    id: 'lavender-sky',
    name: 'ลาเวนเดอร์หวาน',
    className: 'bg-purple-100/95 border-t border-b border-purple-200 shadow-xs text-purple-900',
    patternStyle: {
      backgroundImage:
        'repeating-linear-gradient(45deg, rgba(147,51,234,0.12) 0, rgba(147,51,234,0.12) 3px, transparent 3px, transparent 7px)',
    },
  },
  {
    id: 'sunny-yellow',
    name: 'เหลืองสดใส',
    className: 'bg-yellow-100/95 border-t border-b border-yellow-300/90 shadow-xs text-yellow-900',
    patternStyle: {
      backgroundImage:
        'repeating-linear-gradient(-45deg, rgba(234,179,8,0.15) 0, rgba(234,179,8,0.15) 3px, transparent 3px, transparent 6px)',
    },
  },
];

export const getWashiTapeInfo = (item: FreeScrapbookItem) => {
  // If color is set and matches preset
  if (item.color && WASHI_TAPE_PRESETS.some((t) => t.id === item.color)) {
    const preset = WASHI_TAPE_PRESETS.find((t) => t.id === item.color)!;
    return {
      preset,
      text: item.content || preset.name,
    };
  }
  // If content matches a preset ID (from earlier versions)
  const foundByContent = WASHI_TAPE_PRESETS.find((t) => t.id === item.content);
  if (foundByContent) {
    return {
      preset: foundByContent,
      text: foundByContent.name,
    };
  }
  // Default fallback
  return {
    preset: WASHI_TAPE_PRESETS[0],
    text: item.content || WASHI_TAPE_PRESETS[0].name,
  };
};

export const STICKER_PRESETS = [
  { id: 'heart', emoji: '💖', label: 'หัวใจ' },
  { id: 'star', emoji: '⭐', label: 'ดาวเด่น' },
  { id: 'sparkles', emoji: '✨', label: 'เปล่งประกาย' },
  { id: 'flower', emoji: '🌸', label: 'ดอกซากุระ' },
  { id: 'daisy', emoji: '🌼', label: 'ดอกเดซี่' },
  { id: 'sun', emoji: '☀️', label: 'พระอาทิตย์' },
  { id: 'coffee', emoji: '☕', label: 'กาแฟอุ่น' },
  { id: 'rainbow', emoji: '🌈', label: 'สายรุ้ง' },
  { id: 'cat', emoji: '🐱', label: 'น้องแมว' },
  { id: 'cake', emoji: '🍰', label: 'เค้กหวาน' },
  { id: 'clover', emoji: '🍀', label: 'โคลเวอร์ 4 แฉก' },
  { id: 'balloon', emoji: '🎈', label: 'ลูกโป่ง' },
  { id: 'tulip', emoji: '🌷', label: 'ทิวลิป' },
  { id: 'bear', emoji: '🧸', label: 'ตุ๊กตาหมี' },
  { id: 'cloud', emoji: '☁️', label: 'ก้อนเมฆ' },
  { id: 'music', emoji: '🎵', label: 'ดนตรี' },
  { id: 'moon', emoji: '🌙', label: 'พระจันทร์' },
  { id: 'butterfly', emoji: '🦋', label: 'ผีเสื้อ' },
];

export const STAMP_PRESETS = [
  { id: 'good-day', text: 'GOOD DAY ✨', bg: 'bg-amber-100', textCol: 'text-amber-900', border: 'border-amber-300' },
  { id: 'great-job', text: 'คนเก่ง 🌟', bg: 'bg-rose-100', textCol: 'text-rose-900', border: 'border-rose-300' },
  { id: 'warm-hug', text: 'กอดนะ 💖', bg: 'bg-pink-100', textCol: 'text-pink-900', border: 'border-pink-300' },
  { id: 'take-rest', text: 'พักผ่อนนะ ☕', bg: 'bg-teal-100', textCol: 'text-teal-900', border: 'border-teal-300' },
  { id: 'proud-of-you', text: 'PROUD OF YOU 🌻', bg: 'bg-yellow-100', textCol: 'text-yellow-900', border: 'border-yellow-300' },
  { id: 'love-yourself', text: 'รักตัวเองนะ 🌿', bg: 'bg-emerald-100', textCol: 'text-emerald-900', border: 'border-emerald-300' },
];

interface ScrapbookPickerModalProps {
  onClose: () => void;
  onSelectTape: (tapeId: string, customText?: string) => void;
  onSelectSticker: (emoji: string) => void;
  onSelectStamp: (text: string, styleId: string) => void;
}

export const ScrapbookPickerModal: React.FC<ScrapbookPickerModalProps> = ({
  onClose,
  onSelectTape,
  onSelectSticker,
  onSelectStamp,
}) => {
  const [customTapeText, setCustomTapeText] = useState('');

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-amber-50 rounded-3xl border-2 border-amber-300/80 shadow-2xl p-4 sm:p-5 space-y-4 max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-200 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎨</span>
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-amber-950">
                เลือกของตกแต่งหน้ากระดาษ
              </h4>
              <p className="text-[11px] text-amber-800/80">
                แตะเพื่อวางบนหน้ากระดาษ สามารถลากย้าย หมุน และย่อ/ขยายได้อย่างอิสระ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-amber-200/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Washi Tapes Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-amber-900 flex items-center gap-1.5">
              <span>🏷️</span>
              <span>เทปวาชิตกแต่ง (Washi Tape)</span>
            </label>
            <span className="text-[10px] text-amber-800/70">พิมพ์ข้อความเองได้</span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={customTapeText}
              onChange={(e) => setCustomTapeText(e.target.value)}
              placeholder="พิมพ์ข้อความที่ต้องการใส่บนเทป (หรือเว้นว่างเพื่อใช้ชื่อลาย)..."
              maxLength={40}
              className="w-full px-3 py-1.5 text-xs font-bold rounded-xl bg-white border border-amber-300 text-amber-950 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs pr-8"
            />
            {customTapeText && (
              <button
                type="button"
                onClick={() => setCustomTapeText('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100"
                title="ล้างข้อความ"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {WASHI_TAPE_PRESETS.map((tape) => (
              <button
                key={tape.id}
                type="button"
                onClick={() => {
                  onSelectTape(tape.id, customTapeText.trim() || undefined);
                  onClose();
                }}
                className="group relative h-9 rounded-md px-2 flex items-center justify-center text-xs font-bold transition hover:scale-102 active:scale-98 cursor-pointer overflow-hidden border border-amber-400/60 shadow-2xs"
                style={tape.patternStyle}
              >
                <div className={`absolute inset-0 opacity-85 ${tape.className}`} />
                <span className="relative z-10 text-[11px] font-black text-amber-950/80 drop-shadow-xs truncate max-w-full px-1">
                  {customTapeText.trim() || tape.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Stamps Section */}
        <div className="space-y-2 pt-1 border-t border-amber-200">
          <label className="text-xs font-black text-amber-900 flex items-center gap-1.5">
            <span>💌</span>
            <span>แสตมป์คำให้กำลังใจ (Inspirational Stamps)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {STAMP_PRESETS.map((stamp) => (
              <button
                key={stamp.id}
                type="button"
                onClick={() => {
                  onSelectStamp(stamp.text, stamp.id);
                  onClose();
                }}
                className={`px-3 py-1.5 rounded-xl border-2 ${stamp.border} ${stamp.bg} ${stamp.textCol} text-xs font-black tracking-wide shadow-2xs hover:scale-105 active:scale-95 transition cursor-pointer`}
              >
                {stamp.text}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Cute Stickers Section */}
        <div className="space-y-2 pt-1 border-t border-amber-200">
          <label className="text-xs font-black text-amber-900 flex items-center gap-1.5">
            <span>✨</span>
            <span>สติ๊กเกอร์น่ารัก (Cute Stickers)</span>
          </label>
          <div className="grid grid-cols-6 gap-2">
            {STICKER_PRESETS.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  onSelectSticker(st.emoji);
                  onClose();
                }}
                className="w-11 h-11 rounded-2xl bg-white hover:bg-amber-100 border border-amber-200 flex items-center justify-center text-2xl shadow-2xs hover:scale-110 active:scale-95 transition cursor-pointer"
                title={st.label}
              >
                {st.emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface FreeScrapbookCanvasProps {
  items: FreeScrapbookItem[];
  isDecorating: boolean;
  onUpdateItem: (item: FreeScrapbookItem) => void;
  onDeleteItem: (itemId: string) => void;
  onOpenPicker?: () => void;
}

export const FreeScrapbookCanvas: React.FC<FreeScrapbookCanvasProps> = ({
  items,
  isDecorating,
  onUpdateItem,
  onDeleteItem,
  onOpenPicker,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Deselect if decorating mode is turned off
  useEffect(() => {
    if (!isDecorating) {
      setSelectedItemId(null);
    }
  }, [isDecorating]);

  // Click outside canvas items to deselect
  const handleCanvasClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.scrapbook-item-wrapper')) {
      return;
    }
    if (selectedItemId) {
      setSelectedItemId(null);
    }
  };

  const selectedItem = items.find((i) => i.id === selectedItemId);

  // Helper to adjust scale of selected item
  const handleScaleChange = (delta: number) => {
    if (!selectedItem) return;
    const newScale = Math.min(3.0, Math.max(0.4, Number((selectedItem.scale + delta).toFixed(2))));
    onUpdateItem({ ...selectedItem, scale: newScale });
  };

  // Helper to adjust rotation of selected item
  const handleRotateChange = (degDelta: number) => {
    if (!selectedItem) return;
    let newRotation = (selectedItem.rotation + degDelta) % 360;
    if (newRotation > 180) newRotation -= 360;
    if (newRotation < -180) newRotation += 360;
    onUpdateItem({ ...selectedItem, rotation: newRotation });
  };

  return (
    <div
      ref={containerRef}
      onClick={isDecorating ? handleCanvasClick : undefined}
      className={`absolute inset-0 z-20 ${
        isDecorating ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      {/* Floating Mode Helper Banner when Decorating */}
      {isDecorating && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 bg-amber-900/90 text-white backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg border border-amber-500/50 flex items-center gap-2 text-xs font-bold animate-in fade-in select-none">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: '3s' }} />
          <span>โหมดตกแต่ง: ลากวาง • ย่อ/ขยาย • หมุนสติ๊กเกอร์ได้อิสระ</span>
          {onOpenPicker && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPicker();
              }}
              className="ml-1 px-2 py-0.5 rounded-md bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-[11px] transition shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>เพิ่มของตกแต่ง</span>
            </button>
          )}
        </div>
      )}

      {/* Render all scrapbook items on this paper page */}
      {items.map((item) => {
        const isSelected = isDecorating && selectedItemId === item.id;

        return (
          <DraggableScrapbookItem
            key={item.id}
            item={item}
            isSelected={isSelected}
            isDecorating={isDecorating}
            containerRef={containerRef}
            onSelect={() => setSelectedItemId(item.id)}
            onUpdate={onUpdateItem}
            onDelete={() => {
              onDeleteItem(item.id);
              if (selectedItemId === item.id) setSelectedItemId(null);
            }}
            onScaleChange={handleScaleChange}
            onRotateChange={handleRotateChange}
          />
        );
      })}
    </div>
  );
};

interface DraggableScrapbookItemProps {
  item: FreeScrapbookItem;
  isSelected: boolean;
  isDecorating: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onUpdate: (updated: FreeScrapbookItem) => void;
  onDelete: () => void;
  onScaleChange: (delta: number) => void;
  onRotateChange: (deg: number) => void;
}

const DraggableScrapbookItem: React.FC<DraggableScrapbookItemProps> = ({
  item,
  isSelected,
  isDecorating,
  containerRef,
  onSelect,
  onUpdate,
  onDelete,
  onScaleChange,
  onRotateChange,
}) => {
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; itemX: number; itemY: number }>({
    clientX: 0,
    clientY: 0,
    itemX: item.x,
    itemY: item.y,
  });

  const [isEditingText, setIsEditingText] = useState(false);
  const [tempText, setTempText] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const itemRef = useRef<HTMLDivElement | null>(null);

  const [isRotating, setIsRotating] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const { preset: washiPreset, text: washiText } = getWashiTapeInfo(item);

  // Auto-focus and select text when entering edit mode
  useEffect(() => {
    if (isEditingText) {
      setTempText(item.type === 'tape' ? washiText : item.content);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isEditingText]);

  // Auto-save if deselected while editing
  useEffect(() => {
    if (!isSelected && isEditingText) {
      const trimmed = tempText.trim();
      if (item.type === 'tape') {
        onUpdate({
          ...item,
          content: trimmed || washiPreset.name,
          color: washiPreset.id,
        });
      } else if (item.type === 'stamp') {
        onUpdate({
          ...item,
          content: trimmed || item.content,
        });
      }
      setIsEditingText(false);
    }
  }, [isSelected]);

  const handleSaveText = () => {
    const trimmed = tempText.trim();
    if (item.type === 'tape') {
      onUpdate({
        ...item,
        content: trimmed || washiPreset.name,
        color: washiPreset.id,
      });
    } else if (item.type === 'stamp') {
      onUpdate({
        ...item,
        content: trimmed || item.content,
      });
    }
    setIsEditingText(false);
  };

  // Handle Drag Move (Pointer Events)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isDecorating || isEditingText) return;
    e.stopPropagation();
    onSelect();

    // If clicked on action buttons, inputs, or resize/rotate handles, don't drag whole item
    if ((e.target as HTMLElement).closest('.scrapbook-handle-btn, input, form, button')) {
      return;
    }

    const targetEl = e.currentTarget as HTMLElement;
    targetEl.setPointerCapture(e.pointerId);

    isDraggingRef.current = true;
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      itemX: item.x,
      itemY: item.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    e.stopPropagation();

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const deltaX = e.clientX - dragStartRef.current.clientX;
    const deltaY = e.clientY - dragStartRef.current.clientY;

    const deltaXPercent = (deltaX / rect.width) * 100;
    const deltaYPercent = (deltaY / rect.height) * 100;

    const newX = Math.min(96, Math.max(4, dragStartRef.current.itemX + deltaXPercent));
    const newY = Math.min(96, Math.max(4, dragStartRef.current.itemY + deltaYPercent));

    onUpdate({
      ...item,
      x: Number(newX.toFixed(2)),
      y: Number(newY.toFixed(2)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      e.stopPropagation();
      isDraggingRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Corner Resize Handle Drag Handler (ลากมุมเพื่อย่อ/ขยายขนาด)
  const handleResizeHandleDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const handleEl = e.currentTarget as HTMLElement;
    handleEl.setPointerCapture(e.pointerId);

    setIsResizing(true);
    const startClientX = e.clientX;
    const startScale = item.scale;

    const onResizeMove = (moveEv: PointerEvent) => {
      const deltaX = moveEv.clientX - startClientX;
      // 100px drag = ~0.6 scale change
      const newScale = Math.min(3.0, Math.max(0.4, Number((startScale + deltaX / 140).toFixed(2))));
      onUpdate({ ...item, scale: newScale });
    };

    const onResizeUp = (upEv: PointerEvent) => {
      setIsResizing(false);
      window.removeEventListener('pointermove', onResizeMove);
      window.removeEventListener('pointerup', onResizeUp);
      try {
        handleEl.releasePointerCapture(upEv.pointerId);
      } catch {
        // ignore
      }
    };

    window.addEventListener('pointermove', onResizeMove);
    window.addEventListener('pointerup', onResizeUp);
  };

  // Freeform Rotation Handle Drag Handler (จับหมุนอิสระรอบจุดศูนย์กลาง)
  const handleRotateHandleDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const handleEl = e.currentTarget as HTMLElement;
    handleEl.setPointerCapture(e.pointerId);

    const itemEl = itemRef.current;
    if (!itemEl) return;

    setIsRotating(true);
    const rect = itemEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const startPointerAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    const startRotation = item.rotation;

    const onRotateMove = (moveEv: PointerEvent) => {
      const currentPointerAngle = Math.atan2(moveEv.clientY - centerY, moveEv.clientX - centerX) * (180 / Math.PI);
      let diff = currentPointerAngle - startPointerAngle;
      while (diff <= -180) diff += 360;
      while (diff > 180) diff -= 360;

      let newRotation = startRotation + diff;
      if (moveEv.shiftKey) {
        // Snap ทีละ 15 องศาเมื่อกด Shift ค้าง
        newRotation = Math.round(newRotation / 15) * 15;
      } else {
        newRotation = Math.round(newRotation);
      }

      while (newRotation <= -180) newRotation += 360;
      while (newRotation > 180) newRotation -= 360;

      onUpdate({ ...item, rotation: newRotation });
    };

    const onRotateUp = (upEv: PointerEvent) => {
      setIsRotating(false);
      window.removeEventListener('pointermove', onRotateMove);
      window.removeEventListener('pointerup', onRotateUp);
      try {
        handleEl.releasePointerCapture(upEv.pointerId);
      } catch {
        // ignore
      }
    };

    window.addEventListener('pointermove', onRotateMove);
    window.addEventListener('pointerup', onRotateUp);
  };

  return (
    <div
      ref={itemRef}
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${item.scale})`,
        transformOrigin: 'center center',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`scrapbook-item-wrapper absolute select-none z-30 transition-shadow ${
        isDecorating && !isEditingText
          ? 'cursor-grab active:cursor-grabbing pointer-events-auto touch-none'
          : isDecorating
          ? 'pointer-events-auto cursor-default'
          : 'pointer-events-none'
      } ${
        isSelected
          ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-amber-50 rounded-xl shadow-xl'
          : isDecorating
          ? 'hover:ring-1 hover:ring-amber-400/80 rounded-xl'
          : ''
      }`}
    >
      {/* 1. Item Visuals */}
      <div className="relative p-1">
        {/* A. WASHI TAPE (รองรับการดับเบิลคลิกเพื่อพิมพ์ข้อความ และเปลี่ยนลายได้) */}
        {item.type === 'tape' && (
          <div
            onDoubleClick={(e) => {
              if (!isDecorating) return;
              e.stopPropagation();
              setIsEditingText(true);
            }}
            className={`px-3.5 py-1.5 rounded-xs text-xs font-black border border-amber-300/80 shadow-xs whitespace-nowrap select-none transition flex items-center justify-center min-w-[70px] ${
              washiPreset.className
            }`}
            style={washiPreset.patternStyle}
          >
            {isEditingText ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveText();
                }}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex items-center gap-1 z-40"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={tempText}
                  onChange={(e) => setTempText(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveText();
                    } else if (e.key === 'Escape') {
                      setIsEditingText(false);
                    }
                  }}
                  placeholder="พิมพ์ข้อความบนเทป..."
                  maxLength={50}
                  className="px-2 py-0.5 text-xs font-bold bg-white/95 text-stone-900 rounded border border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs min-w-[120px] max-w-[240px]"
                />
                <button
                  type="submit"
                  className="p-1 rounded bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer"
                  title="บันทึกข้อความ (Enter)"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingText(false);
                  }}
                  className="p-1 rounded bg-stone-300 hover:bg-stone-400 text-stone-800 shadow-xs cursor-pointer"
                  title="ยกเลิก (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <span
                className="opacity-95 drop-shadow-2xs select-none"
                title={isDecorating ? 'ดับเบิลคลิกเพื่อแก้ไขข้อความบนเทป' : undefined}
              >
                {washiText}
              </span>
            )}
          </div>
        )}

        {/* B. INSPIRATIONAL STAMP (รองรับการดับเบิลคลิกเพื่อแก้ไขข้อความได้เช่นกัน) */}
        {item.type === 'stamp' && (
          <div
            onDoubleClick={(e) => {
              if (!isDecorating) return;
              e.stopPropagation();
              setIsEditingText(true);
            }}
            className={`px-3 py-1.5 rounded-xl border-2 border-dashed text-xs font-black tracking-wider shadow-2xs whitespace-nowrap select-none transition flex items-center justify-center ${
              (STAMP_PRESETS.find((s) => s.id === item.color) || STAMP_PRESETS[0]).border
            } ${
              (STAMP_PRESETS.find((s) => s.id === item.color) || STAMP_PRESETS[0]).bg
            } ${
              (STAMP_PRESETS.find((s) => s.id === item.color) || STAMP_PRESETS[0]).textCol
            }`}
          >
            {isEditingText ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveText();
                }}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex items-center gap-1 z-40"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={tempText}
                  onChange={(e) => setTempText(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveText();
                    } else if (e.key === 'Escape') {
                      setIsEditingText(false);
                    }
                  }}
                  placeholder="ข้อความแสตมป์..."
                  maxLength={40}
                  className="px-2 py-0.5 text-xs font-bold bg-white/95 text-stone-900 rounded border border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs min-w-[100px] max-w-[200px]"
                />
                <button
                  type="submit"
                  className="p-1 rounded bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer"
                  title="บันทึกข้อความ"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingText(false);
                  }}
                  className="p-1 rounded bg-stone-300 hover:bg-stone-400 text-stone-800 shadow-xs cursor-pointer"
                  title="ยกเลิก"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <span
                className="cursor-pointer"
                title={isDecorating ? 'ดับเบิลคลิกเพื่อแก้ไขข้อความแสตมป์' : undefined}
              >
                {item.content}
              </span>
            )}
          </div>
        )}

        {/* C. CUTE STICKER */}
        {item.type === 'sticker' && (
          <div className="text-4xl filter drop-shadow-md select-none leading-none">
            <span>{item.content}</span>
          </div>
        )}
      </div>

      {/* 2. Interactive Controls (Visible when this item is selected in Decorating mode) */}
      {isSelected && (
        <>
          {/* Quick Action Floating Bar attached to the top of the item */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`scrapbook-handle-btn absolute ${
              item.y < 16 ? '-bottom-11' : '-top-11'
            } left-1/2 -translate-x-1/2 bg-stone-900/95 text-white backdrop-blur-md px-2 py-1 rounded-xl shadow-xl border border-stone-700 flex items-center gap-1 text-[11px] font-bold z-50 pointer-events-auto whitespace-nowrap`}
            style={{ transform: `scale(${Math.max(0.7, 1 / item.scale)})` }}
          >
            {/* Scale Down */}
            <button
              type="button"
              onClick={() => onScaleChange(-0.15)}
              className="p-1 hover:bg-stone-800 rounded-lg text-stone-300 hover:text-white transition cursor-pointer"
              title="ย่อขนาด (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {/* Scale Label */}
            <span className="font-mono text-[10px] text-amber-300 px-0.5">
              {Math.round(item.scale * 100)}%
            </span>

            {/* Scale Up */}
            <button
              type="button"
              onClick={() => onScaleChange(0.15)}
              className="p-1 hover:bg-stone-800 rounded-lg text-stone-300 hover:text-white transition cursor-pointer"
              title="ขยายขนาด (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <span className="text-stone-600">|</span>

            {/* Rotate Left */}
            <button
              type="button"
              onClick={() => onRotateChange(-15)}
              className="p-1 hover:bg-stone-800 rounded-lg text-stone-300 hover:text-white transition cursor-pointer"
              title="หมุนทวนเข็ม 15°"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Rotation Degree Display */}
            <span className="font-mono text-[10px] text-amber-300 px-0.5" title="องศาการหมุนปัจจุบัน">
              {item.rotation}°
            </span>

            {/* Rotate Right */}
            <button
              type="button"
              onClick={() => onRotateChange(15)}
              className="p-1 hover:bg-stone-800 rounded-lg text-stone-300 hover:text-white transition cursor-pointer"
              title="หมุนตามเข็ม 15°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <span className="text-stone-600">|</span>

            {/* Edit Text Button (For Tape and Stamp) */}
            {(item.type === 'tape' || item.type === 'stamp') && (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditingText(true)}
                  className="p-1 px-1.5 hover:bg-stone-800 rounded-lg text-amber-300 hover:text-amber-200 transition cursor-pointer flex items-center gap-1"
                  title="แก้ไขข้อความ (หรือดับเบิลคลิกที่ตัวเทป)"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span className="text-[10px]">แก้ข้อความ</span>
                </button>

                {item.type === 'tape' && (
                  <button
                    type="button"
                    onClick={() => {
                      const currentIndex = WASHI_TAPE_PRESETS.findIndex((t) => t.id === washiPreset.id);
                      const nextPreset = WASHI_TAPE_PRESETS[(currentIndex + 1) % WASHI_TAPE_PRESETS.length];
                      onUpdate({
                        ...item,
                        color: nextPreset.id,
                        content: washiText,
                      });
                    }}
                    className="p-1 px-1.5 hover:bg-stone-800 rounded-lg text-amber-300 hover:text-amber-200 transition cursor-pointer flex items-center gap-1"
                    title={`เปลี่ยนลายเทป (ปัจจุบัน: ${washiPreset.name})`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span className="text-[10px] hidden sm:inline">เปลี่ยนลาย</span>
                  </button>
                )}

                <span className="text-stone-600">|</span>
              </>
            )}

            {/* Delete */}
            <button
              type="button"
              onClick={onDelete}
              className="p-1 hover:bg-red-900/60 text-red-400 hover:text-red-200 rounded-lg transition cursor-pointer"
              title="ลบสติ๊กเกอร์นี้ออก"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Interactive Freeform Rotation Handle at bottom-left (จับหมุนอิสระ 360 องศา) */}
          <div
            onPointerDown={handleRotateHandleDown}
            className="scrapbook-handle-btn absolute -bottom-2.5 -left-2.5 w-6 h-6 rounded-full bg-amber-600 hover:bg-amber-500 active:bg-amber-700 border-2 border-white shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing z-50 pointer-events-auto touch-none transition-transform hover:scale-115 active:scale-95"
            title="กดค้างแล้วลากเพื่อหมุนอิสระ 360° (กด Shift ค้างเพื่อล็อกมุมทีละ 15°)"
          >
            <RotateCw className="w-3 h-3 text-white pointer-events-none" />
            {isRotating && (
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-stone-900/95 text-amber-300 text-[9px] font-mono whitespace-nowrap shadow-md pointer-events-none border border-stone-700">
                {item.rotation}°
              </span>
            )}
          </div>

          {/* Interactive Corner Resize Drag Handle at bottom-right (ลากย่อ/ขยายขนาด) */}
          <div
            onPointerDown={handleResizeHandleDown}
            className="scrapbook-handle-btn absolute -bottom-2.5 -right-2.5 w-6 h-6 rounded-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 border-2 border-white shadow-md flex items-center justify-center cursor-nwse-resize z-50 pointer-events-auto touch-none transition-transform hover:scale-115 active:scale-95"
            title="กดค้างแล้วลากมุมนี้เพื่อย่อ/ขยายขนาดได้อย่างอิสระ"
          >
            <Move className="w-3 h-3 text-stone-900 pointer-events-none" />
            {isResizing && (
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-stone-900/95 text-amber-300 text-[9px] font-mono whitespace-nowrap shadow-md pointer-events-none border border-stone-700">
                {Math.round(item.scale * 100)}%
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

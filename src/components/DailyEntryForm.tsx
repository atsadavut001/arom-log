import React, { useState, useEffect, useRef } from 'react';
import { MoodPreset, MoodCategory, MoodEntry, DEFAULT_TAGS, MOOD_PRESETS, ScaleMoodLevel } from '../types.ts';
import { MoodSelector } from './MoodSelector.tsx';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import { doc, setDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import confetti from 'canvas-confetti';
import {
  Calendar as CalendarIcon,
  Plus,
  X,
  Image as ImageIcon,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronDown,
  Tag,
} from 'lucide-react';

interface DailyEntryFormProps {
  currentUser: User;
  entries: MoodEntry[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onEntrySaved: (savedEntry: MoodEntry) => void;
  onBack?: () => void;
}

export const DailyEntryForm: React.FC<DailyEntryFormProps> = ({
  currentUser,
  entries,
  selectedDate,
  onDateChange,
  onEntrySaved,
  onBack,
}) => {
  // Find if entry already exists for this date
  const existingEntry = entries.find((e) => e.date === selectedDate);

  const [moodType, setMoodType] = useState<MoodCategory | string>('happy');
  const [moodLabel, setMoodLabel] = useState<string>('มีความสุข');
  const [moodScore, setMoodScore] = useState<number>(5);
  const [moodColor, setMoodColor] = useState<string>('#F59E0B');
  const [customDrawing, setCustomDrawing] = useState<string | undefined>(undefined);

  const [selectedTags, setSelectedTags] = useState<string[]>(['#งาน']);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [isTagsExpanded, setIsTagsExpanded] = useState<boolean>(false);
  const [note, setNote] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync form when date or existingEntry changes
  useEffect(() => {
    if (existingEntry) {
      setMoodType(existingEntry.moodType);
      setMoodLabel(existingEntry.moodLabel);
      setMoodScore(existingEntry.moodScore);
      setMoodColor(existingEntry.moodColor);
      setCustomDrawing(existingEntry.customDrawing);
      setSelectedTags(existingEntry.tags || []);
      setNote(existingEntry.note || '');
      setPhotoUrl(existingEntry.photoUrl);
    } else {
      // Default to happy for fresh day
      const defaultPreset = MOOD_PRESETS[0];
      setMoodType(defaultPreset.type);
      setMoodLabel(defaultPreset.label);
      setMoodScore(defaultPreset.score);
      setMoodColor(defaultPreset.color);
      setCustomDrawing(undefined);
      setSelectedTags(['#งาน']);
      setNote('');
      setPhotoUrl(undefined);
    }
    setSaveSuccess(false);
    setSaveError(null);
  }, [selectedDate, existingEntry]);

  const handleMoodSelect = (preset: MoodPreset, drawing?: string) => {
    setMoodType(preset.type);
    setMoodLabel(preset.label);
    setMoodScore(preset.score);
    setMoodColor(preset.color);
    if (preset.type === 'custom' && drawing) {
      setCustomDrawing(drawing);
    } else if (preset.type !== 'custom') {
      setCustomDrawing(undefined);
    }
  };

  const handleScaleSelect = (level: ScaleMoodLevel) => {
    setMoodType(level.moodType);
    setMoodLabel(level.label);
    setMoodScore(level.score);
    setMoodColor(level.color);
    setCustomDrawing(undefined);
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      if (selectedTags.length >= 10) return;
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    let cleaned = newTagInput.trim();
    if (!cleaned) return;
    if (!cleaned.startsWith('#')) {
      cleaned = '#' + cleaned;
    }
    if (!selectedTags.includes(cleaned) && selectedTags.length < 10) {
      setSelectedTags([...selectedTags, cleaned]);
    }
    setNewTagInput('');
  };

  // Image upload and compression
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress image to max 800x800 to keep doc compact
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
          setPhotoUrl(compressedDataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoUrl(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const nowIso = new Date().toISOString();
      const entryData: MoodEntry = {
        id: selectedDate, // Use date as document ID to strictly enforce 1 entry per day
        userId: currentUser.uid,
        date: selectedDate,
        moodType,
        moodLabel,
        moodScore,
        moodColor,
        customDrawing: customDrawing || '',
        tags: selectedTags,
        note: note.trim(),
        photoUrl: photoUrl || '',
        createdAt: existingEntry ? existingEntry.createdAt : nowIso,
        updatedAt: nowIso,
      };

      const docPath = `users/${currentUser.uid}/entries/${selectedDate}`;
      try {
        await setDoc(doc(db, 'users', currentUser.uid, 'entries', selectedDate), entryData);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, docPath);
      }

      setSaveSuccess(true);
      onEntrySaved(entryData);

      // Confetti burst for rewarding user
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#F59E0B', '#10B981', '#EC4899', '#3B82F6'],
        });
      } catch {
        // Confetti optional
      }

      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to save entry:', err);
      setSaveError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSaving(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;

  return (
    <div className="max-w-3xl mx-auto space-y-3.5 animate-in fade-in pb-8">
      {/* Back button to Calendar */}
      {onBack && (
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold text-gray-700 bg-white hover:bg-amber-50 hover:text-amber-900 border border-gray-200 hover:border-amber-200 transition cursor-pointer shadow-2xs group"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-amber-600 group-hover:-translate-x-0.5 transition-transform" />
            <span>กลับไปหน้าปฏิทิน</span>
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100">
        {/* Top Banner & Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 sm:pb-6 border-b border-gray-100">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mt-2">
            บันทึกอารมณ์ประจำวัน
          </h2>
        </div>

        {/* Date Selection */}
        <div className="flex items-center justify-between sm:justify-start gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-200 w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="w-4 h-4 text-gray-500 ml-1.5" />
            <input
              type="date"
              value={selectedDate}
              max={todayStr}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent border-0 text-xs sm:text-sm font-semibold text-gray-800 focus:ring-0 cursor-pointer pr-1"
            />
          </div>
          {!isToday && (
            <button
              type="button"
              onClick={() => onDateChange(todayStr)}
              className="text-xs bg-white text-amber-800 hover:bg-amber-50 px-2.5 py-1 rounded-xl border border-gray-200 font-medium transition"
            >
              กลับสู่วันนี้
            </button>
          )}
        </div>
      </div>

      {/* Notice if entry already recorded for this day */}
      {existingEntry && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-2.5 text-blue-900 text-xs md:text-sm">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
          <span>
            คุณเคยบันทึกอารมณ์ของวันที่ <strong>{selectedDate}</strong> แล้ว การกดบันทึกใหม่จะเป็นการแก้ไขข้อมูลเดิม
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* FR2.1: Mood Selector with Emoji Mode and 0-10 Scale Mode */}
        <MoodSelector
          key={selectedDate}
          selectedType={moodType}
          selectedScore={moodScore}
          customDrawing={customDrawing}
          onSelectMood={handleMoodSelect}
          onSelectScale={handleScaleSelect}
          autoOpenModal={!existingEntry}
        />

        {/* FR2.3: Tags & Context (Collapsible Accordion) */}
        <div className="rounded-2xl border border-gray-200/90 bg-stone-50/60 p-3.5 sm:p-4 space-y-3 transition-all">
          {/* Header & Toggle */}
          <div
            onClick={() => setIsTagsExpanded(!isTagsExpanded)}
            className="flex items-center justify-between cursor-pointer select-none group"
            role="button"
            aria-expanded={isTagsExpanded}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsTagsExpanded(!isTagsExpanded);
              }
            }}
          >
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-600 shrink-0" />
              <label className="text-sm font-bold text-gray-800 cursor-pointer">
                บริบท & กิจกรรมในวันนี้ (Tags)
              </label>
              {selectedTags.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200/70">
                  {selectedTags.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-xs font-semibold text-amber-800 group-hover:text-amber-900 transition">
              <span>{isTagsExpanded ? 'พับเก็บ' : 'ดูทั้งหมด'}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isTagsExpanded ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>

          {/* Collapsed state: Show preview tags (3 on mobile mode, 5 on web mode) */}
          {!isTagsExpanded && (
            <div className="pt-0.5 flex flex-wrap items-center gap-1.5 animate-in fade-in duration-150">
              {Array.from(new Set([...selectedTags, ...DEFAULT_TAGS])).slice(0, 5).map((tag, index) => {
                const isSelected = selectedTags.includes(tag);
                const isHiddenOnMobile = index >= 3;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-medium transition cursor-pointer items-center gap-1 ${
                      isHiddenOnMobile ? 'hidden sm:inline-flex' : 'inline-flex'
                    } ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-xs font-bold'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <span>{tag}</span>
                    {isSelected && <X className="w-3 h-3 hover:text-red-200 shrink-0" />}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setIsTagsExpanded(true)}
                className="px-2.5 py-1 rounded-xl text-xs font-bold text-amber-700 hover:text-amber-800 hover:bg-amber-100/70 bg-white border border-dashed border-amber-300 transition cursor-pointer inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>เพิ่มเติม...</span>
              </button>
            </div>
          )}

          {/* Expanded state: Show all available tags + Custom tag input */}
          {isTagsExpanded && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>เลือกได้หลายรายการ (สูงสุด 10)</span>
                <span>เลือกแล้ว {selectedTags.length}/10</span>
              </div>

              {/* All tags (default presets + any custom tags) */}
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set([...DEFAULT_TAGS, ...selectedTags])).map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-amber-600 text-white shadow-xs font-bold'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {tag}
                      {isSelected && <X className="w-3 h-3 hover:text-red-200" />}
                    </button>
                  );
                })}
              </div>

              {/* Custom tag input (ช่องเพิ่ม tag) */}
              <div className="flex items-center gap-2 pt-1 border-t border-gray-200/60">
                <div className="relative flex-1 max-w-xs">
                  <input
                    type="text"
                    placeholder="เพิ่มแท็กเอง เช่น #อ่านหนังสือ"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTag(e);
                      }
                    }}
                    className="w-full text-xs md:text-sm px-3.5 py-2 rounded-xl bg-white border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddCustomTag}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่มแท็ก
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FR2.4: Media & Notes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bold text-gray-800">
              บันทึกสั้นประจำวัน (Daily Journal Note)
            </label>
            <span className="text-xs text-gray-400">{note.length}/1000 ตัวอักษร</span>
          </div>
          <textarea
            rows={3}
            maxLength={1000}
            placeholder="วันนี้มีเรื่องราวอะไรเกิดขึ้นบ้าง? อะไรทำให้รู้สึกแบบนี้? บันทึกความรู้สึกสั้นๆ เพื่อทบทวนตัวเอง..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full text-sm p-4 rounded-2xl border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 resize-none"
          />
        </div>

        {/* FR2.4 Photo upload (1 photo per entry) */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-gray-800">
            รูปภาพประกอบ 1 รูป (Daily Photo)
          </label>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
          />

          {photoUrl ? (
            <div className="relative inline-block group rounded-2xl overflow-hidden border-2 border-amber-200">
              <img
                src={photoUrl}
                alt="Daily upload preview"
                className="w-48 h-36 object-cover rounded-2xl"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-full transition shadow-md"
                title="ลบรูปภาพ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2.5 px-4 py-3 border-2 border-dashed border-gray-300 hover:border-amber-500 rounded-2xl text-xs md:text-sm text-gray-600 hover:text-amber-800 bg-gray-50/60 hover:bg-amber-50/40 transition cursor-pointer"
            >
              <ImageIcon className="w-5 h-5 text-gray-400 group-hover:text-amber-600" />
              <span>แนบรูปภาพ 1 รูป (เช่น ภาพอาหาร, ท้องฟ้า, ความทรงจำวันนี้)</span>
            </button>
          )}
        </div>

        {/* Status Messages */}
        {saveError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs md:text-sm flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>บันทึกอารมณ์สำเร็จแล้ว! กำลังพาคุณไปยังหน้าปฏิทิน...</span>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg shrink-0">
              กำลังเปิดปฏิทิน 📅
            </span>
          </div>
        )}

        {/* Submit & Cancel Buttons */}
        <div className="pt-2 flex flex-col items-stretch gap-2.5">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3.5 px-6 rounded-2xl font-bold text-white bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-99 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm md:text-base disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                กำลังบันทึกข้อมูล...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {existingEntry ? 'อัปเดตบันทึกประจำวันนี้' : 'บันทึกอารมณ์วันนี้'}
              </>
            )}
          </button>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={isSaving}
              className="w-full py-3 px-5 rounded-2xl font-bold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 transition-all flex items-center justify-center gap-1.5 text-xs sm:text-sm cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>ยกเลิก / กลับไปปฏิทิน</span>
            </button>
          )}
        </div>
      </form>
    </div>
  </div>
  );
};

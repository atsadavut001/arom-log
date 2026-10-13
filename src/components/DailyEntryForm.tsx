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
  Loader2
} from 'lucide-react';

interface DailyEntryFormProps {
  currentUser: User;
  entries: MoodEntry[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onEntrySaved: (savedEntry: MoodEntry) => void;
}

export const DailyEntryForm: React.FC<DailyEntryFormProps> = ({
  currentUser,
  entries,
  selectedDate,
  onDateChange,
  onEntrySaved,
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
    <div className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100 max-w-3xl mx-auto">
      {/* Top Banner & Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 sm:pb-6 border-b border-gray-100">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Daily Mood Entry
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mt-2">
            บันทึกอารมณ์ประจำวัน
          </h2>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            1 วัน = 1 บันทึกหลัก เพื่อให้สถิติสุขภาพใจสะท้อนความเป็นจริงที่สุด
          </p>
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
          selectedType={moodType}
          selectedScore={moodScore}
          customDrawing={customDrawing}
          onSelectMood={handleMoodSelect}
          onSelectScale={handleScaleSelect}
        />

        {/* FR2.3: Tags & Context */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bold text-gray-800">
              บริบท & กิจกรรมในวันนี้ (Tags)
            </label>
            <span className="text-xs text-gray-500">เลือกได้หลายรายการ (สูงสุด 10)</span>
          </div>

          {/* Quick preset tags */}
          <div className="flex flex-wrap gap-2">
            {DEFAULT_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                  {isSelected && <X className="w-3 h-3 hover:text-red-200" />}
                </button>
              );
            })}
          </div>

          {/* Custom tag input */}
          <div className="flex items-center gap-2 pt-1">
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
                className="w-full text-xs md:text-sm px-3.5 py-2 rounded-xl border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
            </div>
            <button
              type="button"
              onClick={handleAddCustomTag}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-xl flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มแท็ก
            </button>
          </div>
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

        {/* Submit Button */}
        <div className="pt-2">
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
        </div>
      </form>
    </div>
  );
};

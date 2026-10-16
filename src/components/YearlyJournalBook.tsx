import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MoodEntry, UserProfile, MOOD_PRESETS, getAvatarEmojiImage } from '../types.ts';
import { MoodIcon } from './MoodIcon.tsx';
import { playPageTurnSound, playBookCloseSound } from '../utils/audio.ts';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Sparkles,
  Clock,
  Bookmark,
  BookmarkCheck,
  Edit3,
  BookMarked,
  Printer,
  Palette,
} from 'lucide-react';
import {
  FreeScrapbookItem,
  ScrapbookPickerModal,
  FreeScrapbookCanvas,
  WASHI_TAPE_PRESETS,
  STAMP_PRESETS,
} from './ScrapbookDecorations.tsx';

export type RibbonColor = 'rose' | 'amber' | 'emerald' | 'indigo';

export interface BookmarkRibbon {
  page: number;
  color: RibbonColor;
  label: string;
}

export const RIBBON_COLOR_CONFIG: Record<
  RibbonColor,
  { bg: string; hoverBg: string; border: string; text: string; name: string }
> = {
  rose: { bg: 'bg-rose-600', hoverBg: 'hover:bg-rose-500', border: 'border-rose-400', text: 'text-white', name: 'แดงทับทิม' },
  amber: { bg: 'bg-amber-500', hoverBg: 'hover:bg-amber-400', border: 'border-amber-300', text: 'text-amber-950', name: 'สีทอง' },
  emerald: { bg: 'bg-emerald-600', hoverBg: 'hover:bg-emerald-500', border: 'border-emerald-400', text: 'text-white', name: 'เขียวมรกต' },
  indigo: { bg: 'bg-indigo-600', hoverBg: 'hover:bg-indigo-500', border: 'border-indigo-400', text: 'text-white', name: 'ครามหลวง' },
};

interface YearlyJournalBookProps {
  entries: MoodEntry[];
  userProfile: UserProfile;
  isOwnProfile: boolean;
  onSelectDateForEdit?: (dateStr: string) => void;
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const THAI_DAYS_MINI = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

const ENTRIES_PER_PAGE = 3;

// Directional 3D page flip animation variants
const pageTurnVariants = {
  enter: (dir: number) => ({
    rotateY: dir > 0 ? 55 : -55,
    x: dir > 0 ? 50 : -50,
    opacity: 0,
    transformOrigin: dir > 0 ? 'left center' : 'right center',
  }),
  center: {
    rotateY: 0,
    x: 0,
    opacity: 1,
    transformOrigin: 'left center',
    transition: {
      duration: 0.42,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
  exit: (dir: number) => ({
    rotateY: dir > 0 ? -55 : 55,
    x: dir > 0 ? -50 : 50,
    opacity: 0,
    transformOrigin: dir > 0 ? 'left center' : 'right center',
    transition: {
      duration: 0.32,
      ease: [0.32, 0, 0.67, 0] as const,
    },
  }),
};

export const YearlyJournalBook: React.FC<YearlyJournalBookProps> = ({
  entries,
  userProfile,
  isOwnProfile,
  onSelectDateForEdit,
}) => {
  // Current calendar year (e.g. 2026)
  const currentSystemYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentSystemYear);

  // Book open/closed state (Starts closed at Front Cover: หน้าปกหนังสือ)
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Direction of page flip: 1 for next page (forward), -1 for previous page (backward)
  const [direction, setDirection] = useState<number>(1);

  // Available years from entries (always include selectedYear)
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentSystemYear);
    entries.forEach((e) => {
      const y = parseInt(e.date.split('-')[0], 10);
      if (!isNaN(y)) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [entries, currentSystemYear]);

  // Filter entries for selected year only & SORT: จากเก่าไปใหม่ (Oldest -> Newest)
  const yearEntries = useMemo(() => {
    const yearPrefix = `${selectedYear}-`;
    return entries
      .filter((e) => e.date.startsWith(yearPrefix))
      .sort((a, b) => a.date.localeCompare(b.date)); // จากเก่าไปใหม่ (Jan -> Dec)
  }, [entries, selectedYear]);

  // Lookup map for fast date access (YYYY-MM-DD -> MoodEntry)
  const entriesByDate = useMemo(() => {
    const map = new Map<string, MoodEntry>();
    yearEntries.forEach((e) => {
      map.set(e.date, e);
    });
    return map;
  }, [yearEntries]);

  // Chunk entries into pages (ENTRIES_PER_PAGE entries per page)
  const entryPages = useMemo(() => {
    const pages: MoodEntry[][] = [];
    for (let i = 0; i < yearEntries.length; i += ENTRIES_PER_PAGE) {
      pages.push(yearEntries.slice(i, i + ENTRIES_PER_PAGE));
    }
    return pages;
  }, [yearEntries]);

  // Total pages inside book = 1 (Page 1: Yearly Calendar Summary) + entryPages.length
  const totalPages = Math.max(1, 1 + entryPages.length);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset page when year changes
  useEffect(() => {
    setCurrentPage(1);
    setDirection(1);
  }, [selectedYear]);

  // 1. Multiple Ribbon Bookmarks state (persistent per user & year)
  const [bookmarks, setBookmarks] = useState<BookmarkRibbon[]>(() => {
    try {
      const raw = localStorage.getItem(`arom_bookmarks_${userProfile.userId}_${selectedYear}`);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [{ page: 1, color: 'rose', label: 'หน้า 1: สรุปทั้งปี' }];
  });

  // Reload bookmarks when year or user changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`arom_bookmarks_${userProfile.userId}_${selectedYear}`);
      if (raw) {
        setBookmarks(JSON.parse(raw));
        return;
      }
    } catch {
      // ignore
    }
    setBookmarks([{ page: 1, color: 'rose', label: 'หน้า 1: สรุปทั้งปี' }]);
  }, [userProfile.userId, selectedYear]);

  const saveBookmarks = (newBookmarks: BookmarkRibbon[]) => {
    setBookmarks(newBookmarks);
    try {
      localStorage.setItem(`arom_bookmarks_${userProfile.userId}_${selectedYear}`, JSON.stringify(newBookmarks));
    } catch (err) {
      console.error('Failed to save bookmarks:', err);
    }
  };

  const isCurrentPageBookmarked = bookmarks.some((b) => b.page === currentPage);
  const currentBookmark = bookmarks.find((b) => b.page === currentPage);

  const handleToggleBookmark = (overrideColor?: RibbonColor) => {
    if (isCurrentPageBookmarked) {
      saveBookmarks(bookmarks.filter((b) => b.page !== currentPage));
    } else {
      let label = `หน้า ${currentPage}`;
      if (currentPage === 1) {
        label = 'หน้า 1: สรุปทั้งปี';
      } else {
        const pageEntries = entryPages[currentPage - 2] || [];
        if (pageEntries.length > 0) {
          const first = pageEntries[0].date.split('-').slice(1).map(Number);
          const last = pageEntries[pageEntries.length - 1].date.split('-').slice(1).map(Number);
          label = `หน้า ${currentPage}: ${first[1]} ${THAI_MONTHS_SHORT[first[0] - 1]} - ${last[1]} ${THAI_MONTHS_SHORT[last[0] - 1]}`;
        }
      }

      const availableColors: RibbonColor[] = ['rose', 'amber', 'emerald', 'indigo'];
      const usedColors = new Set(bookmarks.map((b) => b.color));
      const nextColor = overrideColor || availableColors.find((c) => !usedColors.has(c)) || 'rose';

      const newBookmark: BookmarkRibbon = {
        page: currentPage,
        color: nextColor,
        label,
      };
      saveBookmarks([...bookmarks, newBookmark].sort((a, b) => a.page - b.page));
    }
  };

  // 2. Free-form Scrapbook Decorator State (Washi tape, stickers, stamps - draggable & resizable anywhere on page)
  const [isDecorating, setIsDecorating] = useState<boolean>(false);
  const [showPickerModal, setShowPickerModal] = useState<boolean>(false);
  const [pageDecorations, setPageDecorations] = useState<Record<number, FreeScrapbookItem[]>>(() => {
    try {
      const raw = localStorage.getItem(`arom_scrapbook_pages_${userProfile.userId}_${selectedYear}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`arom_scrapbook_pages_${userProfile.userId}_${selectedYear}`);
      setPageDecorations(raw ? JSON.parse(raw) : {});
    } catch {
      setPageDecorations({});
    }
  }, [userProfile.userId, selectedYear]);

  const savePageDecorations = (newMap: Record<number, FreeScrapbookItem[]>) => {
    setPageDecorations(newMap);
    try {
      localStorage.setItem(`arom_scrapbook_pages_${userProfile.userId}_${selectedYear}`, JSON.stringify(newMap));
    } catch (err) {
      console.error('Failed to save page decorations:', err);
    }
  };

  const currentDecorations = pageDecorations[currentPage] || [];

  const handleAddDecorationToCurrentPage = (
    item: Omit<FreeScrapbookItem, 'id' | 'x' | 'y' | 'scale' | 'rotation'>
  ) => {
    const randomOffsetX = Math.floor(Math.random() * 24) - 12;
    const randomOffsetY = Math.floor(Math.random() * 24) - 12;
    const newItem: FreeScrapbookItem = {
      ...item,
      id: `deco-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      x: Math.min(85, Math.max(15, 50 + randomOffsetX)),
      y: Math.min(80, Math.max(20, 45 + randomOffsetY)),
      scale: 1.0,
      rotation: Math.floor(Math.random() * 11) - 5,
    };
    savePageDecorations({
      ...pageDecorations,
      [currentPage]: [...currentDecorations, newItem],
    });
  };

  const handleUpdateDecoration = (updated: FreeScrapbookItem) => {
    const list = pageDecorations[currentPage] || [];
    savePageDecorations({
      ...pageDecorations,
      [currentPage]: list.map((i) => (i.id === updated.id ? updated : i)),
    });
  };

  const handleDeleteDecoration = (itemId: string) => {
    const list = pageDecorations[currentPage] || [];
    savePageDecorations({
      ...pageDecorations,
      [currentPage]: list.filter((i) => i.id !== itemId),
    });
  };

  // Handle open book
  const handleOpenBook = () => {
    playPageTurnSound();
    setDirection(1);
    setIsOpen(true);
    setCurrentPage(1);
  };

  // Handle close book to cover
  const handleCloseBook = () => {
    playBookCloseSound();
    setIsOpen(false);
  };

  // Turn to page with sound and direction
  const handleTurnPage = (newPage: number) => {
    // ปิด function การเปลี่ยนหน้าเมื่ออยู่ในโหมดตกแต่งสมุด
    if (isDecorating) return;
    if (newPage === currentPage) return;
    setDirection(newPage > currentPage ? 1 : -1);
    playPageTurnSound();
    setCurrentPage(newPage);
  };

  // Handle click on left or right half of paper page (กดฝั่งซ้าย = ย้อนกลับ, กดฝั่งขวา = หน้าถัดไป)
  const handlePageAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // ปิด function การเปลี่ยนหน้าเมื่ออยู่ในโหมดตกแต่งสมุด
    if (isDecorating) return;

    // If text was selected by the user, don't flip
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      return;
    }

    // Ignore if clicked on an interactive element or card marked with data-no-page-turn
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, [data-no-page-turn="true"], .scrapbook-item-wrapper')) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isLeftHalf = clickX < rect.width / 2;

    if (isLeftHalf) {
      // ฝั่งซ้าย: ย้อนกลับ (หรือปิดสมุดถ้าอยู่หน้า 1)
      if (currentPage <= 1) {
        handleCloseBook();
      } else {
        handleTurnPage(currentPage - 1);
      }
    } else {
      // ฝั่งขวา: เปิดหน้าถัดไป
      if (currentPage < totalPages) {
        handleTurnPage(currentPage + 1);
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ปิด function การเปลี่ยนหน้าด้วยแป้นพิมพ์เมื่ออยู่ในโหมดตกแต่งสมุด
      if (isDecorating) return;

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
          handleOpenBook();
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        if (currentPage <= 1) {
          handleCloseBook();
        } else {
          handleTurnPage(currentPage - 1);
        }
      } else if (e.key === 'ArrowRight') {
        if (currentPage < totalPages) {
          handleTurnPage(currentPage + 1);
        }
      } else if (e.key === 'Escape') {
        handleCloseBook();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, totalPages, isDecorating]);

  // Jump to page by date
  const jumpToDatePage = (targetDate: string) => {
    const index = yearEntries.findIndex((e) => e.date === targetDate);
    if (index !== -1) {
      const pageIndex = Math.floor(index / ENTRIES_PER_PAGE) + 2;
      handleTurnPage(Math.min(totalPages, pageIndex));
    }
  };

  // Jump to month in journal
  const jumpToMonth = (monthIndex: number) => {
    const monthStr = String(monthIndex + 1).padStart(2, '0');
    const targetPrefix = `${selectedYear}-${monthStr}`;
    const firstIndex = yearEntries.findIndex((e) => e.date.startsWith(targetPrefix));
    if (firstIndex !== -1) {
      const pageIndex = Math.floor(firstIndex / ENTRIES_PER_PAGE) + 2;
      handleTurnPage(Math.min(totalPages, pageIndex));
    } else {
      handleTurnPage(1);
    }
  };

  // Stats calculation for Page 1
  const stats = useMemo(() => {
    const totalRecorded = yearEntries.length;
    if (totalRecorded === 0) {
      return {
        totalDays: 0,
        averageScore: '0',
        dominantMood: null,
        positivePercent: 0,
        negativePercent: 0,
      };
    }

    const totalScore10 = yearEntries.reduce((sum, e) => {
      const s = e.moodScore !== undefined ? e.moodScore : 5;
      return sum + (s <= 5 && s > 0 ? s * 2 : s);
    }, 0);
    const averageScore = (totalScore10 / totalRecorded).toFixed(1);

    // Dominant mood
    const counts: Record<string, number> = {};
    let dominantType = '';
    let maxCount = 0;
    yearEntries.forEach((e) => {
      counts[e.moodType] = (counts[e.moodType] || 0) + 1;
      if (counts[e.moodType] > maxCount) {
        maxCount = counts[e.moodType];
        dominantType = e.moodType;
      }
    });

    const dominantPreset = MOOD_PRESETS.find((p) => p.type === dominantType);

    // Positive vs Negative
    const positiveTypes = ['happy', 'excited', 'calm'];
    const negativeTypes = ['sad', 'angry', 'anxious', 'tired'];
    let posCount = 0;
    let negCount = 0;
    yearEntries.forEach((e) => {
      if (positiveTypes.includes(e.moodType)) posCount++;
      else if (negativeTypes.includes(e.moodType)) negCount++;
    });

    return {
      totalDays: totalRecorded,
      averageScore,
      dominantMood: dominantPreset,
      positivePercent: Math.round((posCount / totalRecorded) * 100),
      negativePercent: Math.round((negCount / totalRecorded) * 100),
    };
  }, [yearEntries]);

  const thaiBuddhistYear = selectedYear + 543;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Top Toolbar: Year Switcher & Book Status */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/90 backdrop-blur-sm p-3.5 sm:p-4 rounded-3xl border border-amber-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-300 flex items-center justify-center text-amber-700 shadow-2xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-gray-900 text-sm sm:text-base flex items-center gap-2">
              Journal รายปี — เล่มปี พ.ศ. {thaiBuddhistYear} ({selectedYear})
            </h3>
            <p className="text-xs text-gray-500">
              {isOpen ? `กำลังเปิดอ่านหน้า ${currentPage} / ${totalPages}` : 'สมุดปิดอยู่ • คลิกที่หน้าปกเพื่อเปิดอ่าน'}
              {isDecorating && (
                <span className="ml-2 font-bold text-amber-800 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-md text-[11px]">
                  🎨 โหมดตกแต่ง Scrapbook เปิดอยู่
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Toolbar Action Buttons: Scrapbook, Print, Year Selector & Open/Close */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Scrapbook Decorate Toggle (Own profile only) */}
          {isOwnProfile && isOpen && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsDecorating(!isDecorating)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-2xs flex items-center gap-1.5 ${
                  isDecorating
                    ? 'bg-amber-500 text-white border-amber-600 shadow-amber-200 ring-2 ring-amber-300'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                }`}
                title="เปิด/ปิดโหมดแปะสติ๊กเกอร์และเทปวาชิตกแต่งสมุด"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>{isDecorating ? 'เสร็จสิ้นตกแต่ง' : 'ตกแต่งสมุด 🎨'}</span>
              </button>

              {isDecorating && (
                <button
                  type="button"
                  onClick={() => setShowPickerModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black transition cursor-pointer shadow-2xs flex items-center gap-1 animate-pulse"
                  title="เลือกสติ๊กเกอร์ / เทปวาชิมาวางบนหน้ากระดาษ"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>เพิ่มของตกแต่ง ➕</span>
                </button>
              )}
            </div>
          )}

          {/* Print PDF Button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold transition cursor-pointer shadow-2xs flex items-center gap-1.5"
            title="พิมพ์สมุดทั้งปีหรือบันทึกเป็นไฟล์ PDF สวยงาม"
          >
            <Printer className="w-3.5 h-3.5 text-stone-600" />
            <span className="hidden sm:inline">พิมพ์สมุด (PDF)</span>
          </button>

          {/* Year Selector Dropdown */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="year-select" className="text-xs font-bold text-gray-600 hidden sm:inline">
              เล่มปี:
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setIsOpen(false);
              }}
              className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-800 shadow-2xs focus:ring-2 focus:ring-amber-400 focus:outline-none cursor-pointer"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  ปี พ.ศ. {y + 543} ({y})
                </option>
              ))}
            </select>
          </div>

          {isOpen ? (
            <button
              type="button"
              onClick={handleCloseBook}
              className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition cursor-pointer shadow-2xs flex items-center gap-1.5"
              title="ปิดสมุดและกลับไปหน้าปก"
            >
              <BookMarked className="w-3.5 h-3.5 text-amber-700" />
              <span>ปิดหน้าปก</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenBook}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer shadow-2xs flex items-center gap-1.5 animate-pulse"
              title="เปิดอ่านสมุดบันทึก"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>เปิดอ่าน</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 3D BOOK STAGE (รองรับ Animation เปิด/ปิด สมุด และ พลิกหน้า)                 */}
      {/* ========================================================================= */}
      <div className="no-print relative w-full [perspective:1800px] flex justify-center">
        <AnimatePresence mode="wait">
          {!isOpen ? (
            /* ========================================================================= */
            /* 1. FRONT COVER VIEW (หน้าปกหนังสือเล่มหนังแท้หรูหรา เมื่อยังไม่เปิดสมุด)     */
            /* ========================================================================= */
            <motion.div
              key="book-front-cover"
              initial={{ rotateY: -75, opacity: 0, scale: 0.96 }}
              animate={{
                rotateY: 0,
                opacity: 1,
                scale: 1,
                transition: {
                  duration: 0.55,
                  ease: [0.16, 1, 0.3, 1] as const,
                },
              }}
              exit={{
                rotateY: -95,
                opacity: 0,
                scale: 0.94,
                transition: {
                  duration: 0.45,
                  ease: [0.32, 0, 0.67, 0] as const,
                },
              }}
              style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
              className="w-full flex justify-center py-4 sm:py-6"
            >
              <div
                onClick={handleOpenBook}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenBook();
                  }
                }}
                className="group relative w-full max-w-lg min-h-[580px] sm:min-h-[640px] md:h-[680px] rounded-r-[2.5rem] rounded-l-2xl p-6 sm:p-8 bg-gradient-to-br from-[#3E2310] via-[#5C3317] to-[#2B170A] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] border-r-8 border-b-8 border-[#261408] ring-1 ring-amber-500/20 cursor-pointer transform hover:-translate-y-1 hover:shadow-[0_30px_70px_-12px_rgba(0,0,0,0.7)] transition-all duration-300 flex flex-col justify-between select-none overflow-hidden"
              >
                {/* Subtle Leather Texture Overlay */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle, rgba(251, 191, 36, 0.15) 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                  }}
                />

                {/* Left Spine with 4 Embossed Leather Ribs & Shadow */}
                <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-10 bg-gradient-to-r from-[#1E0F06] via-[#331B0D] to-transparent border-r border-amber-900/50 flex flex-col justify-around py-8 pointer-events-none">
                  <div className="h-1.5 w-full bg-amber-950/90 shadow-sm border-y border-amber-700/40" />
                  <div className="h-1.5 w-full bg-amber-950/90 shadow-sm border-y border-amber-700/40" />
                  <div className="h-1.5 w-full bg-amber-950/90 shadow-sm border-y border-amber-700/40" />
                  <div className="h-1.5 w-full bg-amber-950/90 shadow-sm border-y border-amber-700/40" />
                </div>

                {/* 4 Brass Metal Corners */}
                <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-400/80 rounded-tr-xl pointer-events-none" />
                <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-400/80 rounded-br-xl pointer-events-none" />
                <div className="absolute top-2 left-10 w-8 h-8 border-t-2 border-l-2 border-amber-400/80 rounded-tl-sm pointer-events-none" />
                <div className="absolute bottom-2 left-10 w-8 h-8 border-b-2 border-l-2 border-amber-400/80 rounded-bl-sm pointer-events-none" />

                {/* Stitched Gold Border along perimeter */}
                <div className="absolute inset-4 left-12 border border-dashed border-amber-400/40 rounded-r-3xl rounded-l-md pointer-events-none" />

                {/* Silk Bookmark Ribbon Hanging from bottom right */}
                <div className="absolute -bottom-2 right-12 z-20 w-8 h-16 bg-gradient-to-b from-rose-700 to-rose-600 rounded-b-md shadow-lg border-t border-rose-500 flex items-end justify-center pb-2">
                  <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[10px] border-t-rose-600 -mb-2" />
                </div>

                {/* COVER HEADER */}
                <div className="relative z-10 pl-6 sm:pl-8 text-center space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[11px] font-mono tracking-widest uppercase">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>AROM LOG • ANNUAL JOURNAL</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 drop-shadow-md">
                    สมุดบันทึกอารมณ์
                  </h1>
                  <div className="text-xs sm:text-sm font-semibold tracking-widest text-amber-300/80 uppercase font-mono">
                    ประจำปี พ.ศ. {thaiBuddhistYear} • {selectedYear}
                  </div>
                </div>

                {/* COVER CENTER: EMBOSSED EMBLEM / GOLD MEDALLION */}
                <div className="relative z-10 pl-6 sm:pl-8 flex flex-col items-center justify-center my-6">
                  <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-amber-500/20 via-amber-700/30 to-amber-900/40 border-2 border-amber-400/60 shadow-[inset_0_2px_10px_rgba(251,191,36,0.3)] flex flex-col items-center justify-center p-4 group-hover:scale-105 transition-transform duration-300">
                    {/* Outer Ring Ornaments */}
                    <div className="absolute inset-1 rounded-full border border-dashed border-amber-300/40 pointer-events-none" />

                    {/* User Avatar Inside Emblem */}
                    <div
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden flex items-center justify-center text-3xl sm:text-4xl shadow-md border-2 border-amber-200/90 mb-1.5"
                      style={{ backgroundColor: userProfile.avatarBg || '#FEF3C7' }}
                    >
                      {userProfile.photoURL ? (
                        <img
                          src={userProfile.photoURL}
                          alt={userProfile.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : getAvatarEmojiImage(userProfile.avatarEmoji) ? (
                        <img
                          src={getAvatarEmojiImage(userProfile.avatarEmoji)!}
                          alt={userProfile.displayName}
                          className="w-full h-full object-contain p-1.5 select-none"
                          draggable={false}
                        />
                      ) : (
                        <span>{userProfile.avatarEmoji || '😊'}</span>
                      )}
                    </div>

                    <div className="text-center">
                      <div className="text-xs sm:text-sm font-black text-amber-200 truncate max-w-[120px]">
                        {userProfile.displayName}
                      </div>
                      <div className="text-[10px] text-amber-400/80 font-mono">
                        {userProfile.handle ? `@${userProfile.handle.replace(/^@/, '')}` : `@${userProfile.userId.slice(0, 6)}`}
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-amber-300/70 italic mt-3 text-center max-w-xs">
                    "บันทึกแห่งใจ เรียนรู้และเข้าใจทุกความรู้สึกตลอด 365 วัน"
                  </p>
                </div>

                {/* COVER FOOTER: CALL TO ACTION BUTTON */}
                <div className="relative z-10 pl-6 sm:pl-8 text-center space-y-3">
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-900/40 transition-all transform group-hover:scale-105">
                    <BookOpen className="w-4 h-4 text-stone-950" />
                    <span>คลิกเพื่อเปิดสมุดบันทึกเล่มนี้</span>
                    <ChevronRight className="w-4 h-4 text-stone-950" />
                  </div>

                  <div className="flex items-center justify-center gap-4 text-[10px] text-amber-400/60 font-mono">
                    <span>บันทึกแล้ว {stats.totalDays} วัน</span>
                    <span>•</span>
                    <span>รวม {totalPages} หน้า</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* ========================================================================= */
            /* 2. OPEN BOOK SPREAD (เมื่อเปิดหนังสือแล้ว — ขนาดหน้าคงที่เท่ากันทุกหน้า)  */
            /* ========================================================================= */
            <motion.div
              key="book-inside-spread"
              initial={{ rotateY: 35, opacity: 0, scale: 0.96 }}
              animate={{
                rotateY: 0,
                opacity: 1,
                scale: 1,
                transition: {
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1] as const,
                },
              }}
              exit={{
                rotateY: 45,
                opacity: 0,
                scale: 0.95,
                transition: {
                  duration: 0.38,
                  ease: [0.32, 0, 0.67, 0] as const,
                },
              }}
              style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
              className="w-full relative rounded-[2.5rem] p-3 sm:p-5 md:p-7 bg-gradient-to-br from-[#3E2310] via-[#5C3317] to-[#2B170A] shadow-2xl border-4 border-amber-950/80 ring-1 ring-amber-700/30"
            >
              {/* Dynamic Book Ribbon Bookmarks hanging out from top edge */}
              <div className="absolute -top-3 sm:-top-3.5 right-6 sm:right-14 z-30 flex items-start gap-1.5 sm:gap-2 pointer-events-auto">
                {bookmarks.map((ribbon) => {
                  const colorCfg = RIBBON_COLOR_CONFIG[ribbon.color] || RIBBON_COLOR_CONFIG.rose;
                  const isCurrent = ribbon.page === currentPage;
                  return (
                    <button
                      key={ribbon.page}
                      type="button"
                      disabled={isDecorating}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isDecorating) return;
                        handleTurnPage(ribbon.page);
                      }}
                      className={`w-7 sm:w-8 ${
                        isCurrent ? 'h-13 sm:h-14 shadow-lg scale-105' : 'h-10 sm:h-11 shadow-md opacity-90 hover:opacity-100 hover:h-12'
                      } ${colorCfg.bg} ${colorCfg.hoverBg} ${
                        isDecorating ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                      } rounded-b-md flex items-end justify-center pb-1 text-white text-[10px] font-bold border-t ${colorCfg.border} select-none transition-all duration-200 group relative`}
                      title={isDecorating ? "โหมดตกแต่งสมุด: ปิดการเปลี่ยนหน้าชั่วคราว" : `คลิกกระโดดไป ${ribbon.label}`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${colorCfg.text} fill-current group-hover:scale-110 transition-transform`} />
                      {/* Tooltip */}
                      <span className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-stone-900/95 text-stone-100 text-[10px] rounded-lg font-sans whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition shadow-lg z-50 border border-stone-700">
                        {ribbon.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Inner Paper Page Container — EXACT SAME SIZE FOR ALL PAGES */}
              <div
                onClick={handlePageAreaClick}
                className="relative w-full min-h-[640px] md:h-[720px] rounded-[2rem] bg-[#FCFBF7] text-gray-800 shadow-inner border border-amber-200/90 flex flex-col justify-between overflow-hidden cursor-default select-text"
                title={isDecorating ? "🎨 โหมดตกแต่งสมุด (ลากวาง/ขยาย/หมุนสติ๊กเกอร์ได้อิสระ • ปิดการแตะเปลี่ยนหน้า)" : "คลิกฝั่งซ้ายของกระดาษเพื่อย้อนกลับ • คลิกฝั่งขวาเพื่อไปหน้าถัดไป"}
              >
                {/* Subtle notebook ruled background & spine crease shadow */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-40"
                  style={{
                    backgroundImage:
                      'linear-gradient(to bottom, rgba(245, 158, 11, 0.05) 1px, transparent 1px)',
                    backgroundSize: '100% 28px',
                  }}
                />
                {/* Spine fold gradient down the center */}
                <div className="absolute top-0 bottom-0 left-0 sm:left-4 w-4 bg-linear-to-r from-stone-400/20 via-transparent to-transparent pointer-events-none" />

                {/* FREE-FORM SCRAPBOOK CANVAS (ลากวาง ย่อ/ขยาย หมุน ได้อิสระทั่วทั้งหน้ากระดาษ) */}
                <FreeScrapbookCanvas
                  items={currentDecorations}
                  isDecorating={isDecorating}
                  onUpdateItem={handleUpdateDecoration}
                  onDeleteItem={handleDeleteDecoration}
                  onOpenPicker={() => setShowPickerModal(true)}
                />

                {/* LEFT SIDE FLOATING TURN TAB (กดฝั่งซ้ายของกระดาษ = ย้อนกลับ) - ซ่อนชั่วคราวเมื่ออยู่ในโหมดตกแต่งเพื่อไม่ให้เกะกะ */}
                {!isDecorating && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentPage <= 1) {
                        handleCloseBook();
                      } else {
                        handleTurnPage(currentPage - 1);
                      }
                    }}
                    className="absolute left-1 sm:left-2.5 top-1/2 -translate-y-1/2 z-30 group/prev-tab px-1.5 py-4 sm:px-2 sm:py-5 rounded-2xl bg-amber-900/10 hover:bg-amber-800/25 active:scale-95 transition-all text-amber-950 backdrop-blur-xs border border-amber-900/15 shadow-sm flex flex-col items-center justify-center gap-1 cursor-pointer"
                    title={currentPage <= 1 ? "คลิกฝั่งซ้ายเพื่อปิดสมุด (หน้าปก)" : "คลิกฝั่งซ้ายเพื่อย้อนกลับ (หน้าก่อนหน้า)"}
                    aria-label={currentPage <= 1 ? "ปิดสมุด" : "หน้าก่อนหน้า"}
                  >
                    <ChevronLeft className="w-5 h-5 text-amber-900 group-hover/prev-tab:-translate-x-0.5 transition-transform" />
                    <span className="[writing-mode:vertical-rl] text-[9px] font-bold text-amber-900/80 tracking-widest hidden md:inline select-none">
                      {currentPage <= 1 ? 'ปิดปก' : 'ย้อนกลับ'}
                    </span>
                  </button>
                )}

                {/* RIGHT SIDE FLOATING TURN TAB (กดฝั่งขวาของกระดาษ = เปิดหน้าถัดไป) - ซ่อนชั่วคราวเมื่ออยู่ในโหมดตกแต่งเพื่อไม่ให้เกะกะ */}
                {!isDecorating && currentPage < totalPages && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTurnPage(currentPage + 1);
                    }}
                    className="absolute right-1 sm:right-2.5 top-1/2 -translate-y-1/2 z-30 group/next-tab px-1.5 py-4 sm:px-2 sm:py-5 rounded-2xl bg-amber-900/10 hover:bg-amber-800/25 active:scale-95 transition-all text-amber-950 backdrop-blur-xs border border-amber-900/15 shadow-sm flex flex-col items-center justify-center gap-1 cursor-pointer"
                    title="คลิกฝั่งขวาเพื่อเปิดหน้าถัดไป"
                    aria-label="หน้าถัดไป"
                  >
                    <ChevronRight className="w-5 h-5 text-amber-900 group-hover/next-tab:translate-x-0.5 transition-transform" />
                    <span className="[writing-mode:vertical-rl] text-[9px] font-bold text-amber-900/80 tracking-widest hidden md:inline select-none">
                      ถัดไป
                    </span>
                  </button>
                )}

                {/* PAGE CONTENT CONTAINER WITH 3D PERSPECTIVE */}
                <div className="relative z-10 flex-1 py-4 sm:py-6 md:py-8 px-6 sm:px-8 md:px-12 flex flex-col overflow-hidden [perspective:1400px]">
                  <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                      key={`journal-page-${currentPage}`}
                      custom={direction}
                      variants={pageTurnVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      style={{ transformStyle: 'preserve-3d' }}
                      className="flex-1 flex flex-col justify-between overflow-y-auto"
                    >
                      {/* Dynamic Paper Turn Shadow Sheen */}
                      <motion.div
                        initial={{ opacity: 0.35 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.35 }}
                        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-stone-900/10 via-amber-500/5 to-transparent rounded-2xl z-20"
                      />

                      {currentPage === 1 ? (
                /* ========================================================================= */
                /* PAGE 1: สรุปปฏิทินทั้งปี (Whole Year Calendar Summary & Mood in Pixels)   */
                /* ========================================================================= */
                <div className="space-y-5 animate-in fade-in duration-300 flex-1 flex flex-col">
                  {/* Book Header Stamp */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b-2 border-dashed border-amber-300/80 gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-200">
                            หน้า 1 • สรุปปฏิทินทั้งปี (Year in Pixels)
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleBookmark();
                            }}
                            className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs ${
                              isCurrentPageBookmarked
                                ? 'bg-rose-100 text-rose-900 border-rose-300'
                                : 'bg-white hover:bg-amber-50 text-stone-600 border-amber-200'
                            }`}
                            title={isCurrentPageBookmarked ? "ยกเลิกคั่นหน้านี้" : "คั่นหน้านี้ด้วยริบบิ้น"}
                          >
                            {isCurrentPageBookmarked ? (
                              <>
                                <BookmarkCheck className="w-3 h-3 text-rose-600" />
                                <span>คั่นหน้านี้แล้ว</span>
                              </>
                            ) : (
                              <>
                                <Bookmark className="w-3 h-3 text-stone-400" />
                                <span>คั่นหน้านี้</span>
                              </>
                            )}
                          </button>
                        </div>
                        <h2 className="text-lg sm:text-2xl font-black text-amber-950 mt-1">
                          สมุดบันทึกอารมณ์ประจำปี พ.ศ. {thaiBuddhistYear}
                        </h2>
                        <p className="text-xs text-stone-500">
                          ของ {userProfile.displayName} ({userProfile.handle ? `@${userProfile.handle.replace(/^@/, '')}` : `@${userProfile.userId.slice(0, 6)}`})
                        </p>
                      </div>

                    {/* Year Key Stats Mini Cards */}
                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
                        <div className="text-[10px] text-amber-800 font-bold">บันทึกแล้ว</div>
                        <div className="text-sm font-black text-gray-900">
                          {stats.totalDays} <span className="text-[10px] font-normal">วัน</span>
                        </div>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                        <div className="text-[10px] text-emerald-800 font-bold">คะแนนเฉลี่ย</div>
                        <div className="text-sm font-black text-gray-900">
                          {stats.averageScore} <span className="text-[10px] font-normal">/ 10</span>
                        </div>
                      </div>
                      {stats.dominantMood && (
                        <div className="px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-center">
                          <div className="text-[10px] text-orange-800 font-bold">อารมณ์เด่น</div>
                          <div className="text-sm font-black text-gray-900 flex items-center gap-1.5 justify-center">
                            {stats.dominantMood.emojiUrl ? (
                              <img
                                src={stats.dominantMood.emojiUrl}
                                alt={stats.dominantMood.label}
                                className="w-5 h-5 object-contain inline-block shrink-0"
                              />
                            ) : (
                              <span>{stats.dominantMood.emoji}</span>
                            )}
                            <span className="text-xs hidden md:inline truncate max-w-[60px]">
                              {stats.dominantMood.label}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 12-Month Mini Calendar Grid ("Year in Pixels") */}
                  <div className="flex-1">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                      {THAI_MONTHS.map((monthName, mIdx) => {
                        const daysInMonth = new Date(selectedYear, mIdx + 1, 0).getDate();
                        const firstDayWeek = new Date(selectedYear, mIdx, 1).getDay(); // 0 = Sun
                        const monthNumStr = String(mIdx + 1).padStart(2, '0');

                        // Count entries in this month
                        let monthEntryCount = 0;
                        for (let d = 1; d <= daysInMonth; d++) {
                          const dateStr = `${selectedYear}-${monthNumStr}-${String(d).padStart(2, '0')}`;
                          if (entriesByDate.has(dateStr)) monthEntryCount++;
                        }

                        return (
                          <div
                            key={monthName}
                            onClick={(e) => {
                              e.stopPropagation();
                              jumpToMonth(mIdx);
                            }}
                            data-no-page-turn="true"
                            className="bg-white/80 hover:bg-white rounded-2xl p-2.5 border border-amber-200/60 shadow-2xs transition-all hover:shadow-xs hover:border-amber-400 group cursor-pointer flex flex-col justify-between"
                          >
                            {/* Month Header */}
                            <div className="flex items-center justify-between pb-1 border-b border-gray-100 text-[11px] font-bold">
                              <span className="text-amber-950 group-hover:text-amber-700">
                                {monthName}
                              </span>
                              <span className="text-[9px] text-stone-400 font-mono">
                                {monthEntryCount > 0 ? `${monthEntryCount} วัน` : '—'}
                              </span>
                            </div>

                            {/* Mini 7-col Day Grid */}
                            <div className="grid grid-cols-7 gap-0.5 pt-1.5 text-center">
                              {/* Empty lead cells for day alignment */}
                              {Array.from({ length: firstDayWeek }).map((_, i) => (
                                <div key={`empty-${i}`} className="w-full aspect-square" />
                              ))}

                              {/* Days */}
                              {Array.from({ length: daysInMonth }).map((_, dIdx) => {
                                const day = dIdx + 1;
                                const dateStr = `${selectedYear}-${monthNumStr}-${String(day).padStart(2, '0')}`;
                                const entry = entriesByDate.get(dateStr);

                                if (entry) {
                                  const preset = MOOD_PRESETS.find((p) => p.type === entry.moodType);
                                  const dotColor = preset?.color || entry.moodColor || '#F59E0B';

                                  return (
                                    <div
                                      key={dateStr}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        jumpToDatePage(dateStr);
                                      }}
                                      data-no-page-turn="true"
                                      className="w-full aspect-square rounded-full flex items-center justify-center transition-transform hover:scale-125 cursor-pointer shadow-2xs text-[8px] font-bold text-white"
                                      style={{ backgroundColor: dotColor }}
                                      title={`${day} ${THAI_MONTHS_SHORT[mIdx]}: ${entry.moodLabel} (${entry.moodScore}/10) - ${entry.note || ''}`}
                                    >
                                      <span className="leading-none text-[8px]">{day}</span>
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    key={dateStr}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                    data-no-page-turn="true"
                                    className="w-full aspect-square rounded-md flex items-center justify-center text-[8px] text-stone-300 hover:text-stone-600 hover:bg-stone-100 transition-colors"
                                  >
                                    {day}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Legend & Hint */}
                  <div className="pt-2 border-t border-amber-200/80 flex flex-wrap items-center justify-between text-[11px] text-stone-600 gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-bold text-amber-950">คำอธิบายสี:</span>
                      {MOOD_PRESETS.slice(0, 5).map((preset) => (
                        <span key={preset.type} className="inline-flex items-center gap-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: preset.color }}
                          />
                          {preset.emojiUrl ? (
                            <img
                              src={preset.emojiUrl}
                              alt={preset.label}
                              className="w-3.5 h-3.5 object-contain inline-block shrink-0"
                            />
                          ) : (
                            <span>{preset.emoji}</span>
                          )}
                          <span>{preset.label}</span>
                        </span>
                      ))}
                    </div>

                    <span className="text-[10px] text-amber-800 font-medium italic">
                      คลิกเดือนหรือวันที่เพื่อพลิกไปหน้าบันทึกวันนั้น
                    </span>
                  </div>
                </div>
              ) : (
                /* ========================================================================= */
                /* PAGES 2+: บันทึกอารมณ์ประจำวัน (Daily Mood Entries — เก่าไปใหม่)         */
                /* ========================================================================= */
                <div className="space-y-4 animate-in fade-in duration-300 flex-1 flex flex-col justify-between">
                  {/* Page Header */}
                  <div className="flex items-center justify-between pb-3 border-b-2 border-dashed border-amber-300/80">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase text-amber-800 bg-amber-100/90 px-3 py-0.5 rounded-full border border-amber-200">
                        หน้า {currentPage} จาก {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleBookmark();
                        }}
                        className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs ${
                          isCurrentPageBookmarked
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : 'bg-white hover:bg-amber-50 text-stone-600 border-amber-200'
                        }`}
                        title={isCurrentPageBookmarked ? "ยกเลิกคั่นหน้านี้" : "คั่นหน้านี้ด้วยริบบิ้น"}
                      >
                        {isCurrentPageBookmarked ? (
                          <>
                            <BookmarkCheck className="w-3 h-3 text-rose-600" />
                            <span>คั่นหน้านี้แล้ว</span>
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-3 h-3 text-stone-400" />
                            <span>คั่นหน้านี้</span>
                          </>
                        )}
                      </button>
                      <span className="text-xs text-stone-500 hidden sm:inline">
                        บันทึกอารมณ์ประจำปี {thaiBuddhistYear}
                      </span>
                    </div>

                    <div className="flex items-center gap-2" data-no-page-turn="true">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTurnPage(1);
                        }}
                        className="text-xs font-bold text-amber-800 hover:text-amber-950 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>หน้าสรุปทั้งปี</span>
                      </button>
                      <span className="text-gray-300">•</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloseBook();
                        }}
                        className="text-xs font-bold text-stone-600 hover:text-stone-900 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <BookMarked className="w-3.5 h-3.5" />
                        <span>ปิดสมุด</span>
                      </button>
                    </div>
                  </div>

                  {/* Entry Cards List for this Page (Fixed count: 3 entries per page) */}
                  <div className="space-y-3.5 flex-1">
                    {entryPages[currentPage - 2]?.map((entry) => {
                      const preset = MOOD_PRESETS.find((p) => p.type === entry.moodType);
                      const [y, m, d] = entry.date.split('-').map(Number);
                      const monthName = THAI_MONTHS[m - 1] || '';
                      const dayOfWeekIdx = new Date(y, m - 1, d).getDay();
                      const dayName = THAI_DAYS_MINI[dayOfWeekIdx] || '';
                      const dateFormatted = `วัน${dayName}ที่ ${d} ${monthName} พ.ศ. ${y + 543}`;

                      return (
                        <div
                          key={entry.id || entry.date}
                          data-no-page-turn="true"
                          className="bg-white/95 rounded-2xl p-3.5 sm:p-4 border border-amber-200/80 shadow-xs hover:border-amber-300 transition-all flex flex-col sm:flex-row gap-3 sm:gap-4 items-start relative group"
                        >
                          {/* Left: Date Stamp & Mood Emoji Ribbon */}
                          <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-2 sm:gap-1.5 shrink-0 w-full sm:w-28 p-2 rounded-xl bg-amber-50/70 border border-amber-200 text-center">
                            <div className="flex justify-center">
                              <MoodIcon
                                moodType={entry.moodType}
                                customDrawing={entry.customDrawing}
                                className="w-8 h-8 sm:w-9 sm:h-9"
                                alt={entry.moodLabel}
                              />
                            </div>
                            <div>
                              <div className="text-xs font-extrabold text-amber-950">
                                {d} {THAI_MONTHS_SHORT[m - 1]}
                              </div>
                              <div className="text-[10px] text-amber-700 font-medium">
                                {entry.moodLabel}
                              </div>
                              <div className="text-[10px] font-black text-amber-900 mt-0.5">
                                {entry.moodScore}/10
                              </div>
                            </div>
                          </div>

                          {/* Center / Body: Note, Tags & Images */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                                <CalendarIcon className="w-3.5 h-3.5 text-amber-600" />
                                {dateFormatted}
                              </span>

                              {/* Edit link if own profile */}
                              {isOwnProfile && onSelectDateForEdit && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectDateForEdit(entry.date);
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>แก้ไขบันทึก</span>
                                </button>
                              )}
                            </div>

                            {/* Note / Text */}
                            {entry.note ? (
                              <p className="text-xs sm:text-[13px] text-gray-800 leading-relaxed font-sans bg-amber-50/40 p-2.5 rounded-xl border border-amber-100/80 whitespace-pre-wrap">
                                {entry.note}
                              </p>
                            ) : (
                              <p className="text-xs text-stone-400 italic">
                                ไม่ได้เขียนบันทึกข้อความสำหรับวันนี้
                              </p>
                            )}

                            {/* Tags */}
                            {entry.tags && entry.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {entry.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-stone-100 text-stone-700 border border-stone-200"
                                  >
                                    {tag.startsWith('#') ? tag : `#${tag}`}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Custom Drawing or Photo Thumbnail if exists */}
                            {(entry.customDrawing || entry.photoUrl) && (
                              <div className="flex items-center gap-2 pt-1">
                                {entry.customDrawing && (
                                  <div className="p-1 bg-white rounded-xl border border-amber-200 shadow-2xs">
                                    <img
                                      src={entry.customDrawing}
                                      alt="ภาพวาดอารมณ์"
                                      className="w-14 h-14 object-contain rounded-lg bg-amber-50/50"
                                    />
                                  </div>
                                )}
                                {entry.photoUrl && (
                                  <div className="p-1 bg-white rounded-xl border border-amber-200 shadow-2xs">
                                    <img
                                      src={entry.photoUrl}
                                      alt="รูปภาพประจำวัน"
                                      className="w-14 h-14 object-cover rounded-lg"
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Quick Add Sticker button (Available when isDecorating mode is active) */}
                            {isOwnProfile && isDecorating && (
                              <div className="pt-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowPickerModal(true);
                                  }}
                                  className="px-2.5 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[11px] font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                                >
                                  <Sparkles className="w-3 h-3 text-amber-700" />
                                  <span>แปะสติ๊กเกอร์หน้านี้ 🎨</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Empty state if no entries on this page */}
                    {(!entryPages[currentPage - 2] || entryPages[currentPage - 2].length === 0) && (
                      <div className="py-20 text-center space-y-2">
                        <Clock className="w-10 h-10 text-stone-300 mx-auto" />
                        <p className="text-sm font-bold text-stone-500">
                          ยังไม่มีบันทึกอารมณ์ในหน้านี้
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bottom Page Note */}
                  <div className="text-center text-[10px] text-stone-400 font-mono">
                    - Arom Log Journal • ประจำปี {thaiBuddhistYear} -
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* BOOK BOTTOM CONTROLS & NAVIGATION BAR (Page Turner) */}
        <div data-no-page-turn="true" className="relative z-10 px-4 py-3 bg-amber-100/70 border-t border-amber-200/90 flex items-center justify-between gap-3 text-xs font-bold text-amber-950 select-none">
          {/* Previous Page Button (Closes book if on page 1) */}
          <button
            type="button"
            disabled={isDecorating}
            onClick={(e) => {
              e.stopPropagation();
              if (isDecorating) return;
              if (currentPage <= 1) {
                handleCloseBook();
              } else {
                handleTurnPage(currentPage - 1);
              }
            }}
            className="px-3 sm:px-4 py-2 rounded-xl bg-white hover:bg-amber-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed border border-amber-300/80 shadow-2xs transition flex items-center gap-1.5 cursor-pointer font-bold"
          >
            <ChevronLeft className="w-4 h-4 text-amber-700" />
            <span>{currentPage <= 1 ? 'ปิดสมุด (หน้าปก)' : 'หน้าก่อนหน้า'}</span>
          </button>

          {/* Page Indicator & Click Hints */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/90 border border-amber-300 shadow-2xs font-mono text-xs">
              {currentPage === 1 ? 'หน้าแรก (สรุปทั้งปี)' : `หน้า ${currentPage} / ${totalPages}`}
            </span>
            {isDecorating ? (
              <span className="text-[10px] sm:text-xs text-amber-900 font-bold flex items-center gap-1 bg-amber-200/80 px-2.5 py-1 rounded-full border border-amber-400/60 shadow-2xs">
                🎨 กำลังอยู่ในโหมดตกแต่งสมุด (ปิดการเปลี่ยนหน้าชั่วคราว)
              </span>
            ) : (
              <span className="text-[10px] text-amber-900/60 hidden sm:inline font-medium">
                (👈 แตะฝั่งซ้าย: ย้อนกลับ • แตะฝั่งขวา: ถัดไป 👉)
              </span>
            )}
          </div>

          {/* Next Page Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isDecorating) return;
              handleTurnPage(currentPage + 1);
            }}
            disabled={isDecorating || currentPage >= totalPages}
            className="px-3 sm:px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-2xs transition flex items-center gap-1.5 cursor-pointer font-bold"
          >
            <span>หน้าถัดไป</span>
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>
</div>

      {/* SCRAPBOOK PICKER MODAL (เลือกสติ๊กเกอร์ / เทปวาชิ / แสตมป์) */}
      {showPickerModal && (
        <ScrapbookPickerModal
          onClose={() => setShowPickerModal(false)}
          onSelectTape={(tapeId, customText) => {
            const preset = WASHI_TAPE_PRESETS.find((t) => t.id === tapeId);
            const text = customText?.trim() || preset?.name || 'เทปวาชิ';
            handleAddDecorationToCurrentPage({ type: 'tape', content: text, color: tapeId });
          }}
          onSelectSticker={(emoji) => {
            handleAddDecorationToCurrentPage({ type: 'sticker', content: emoji });
          }}
          onSelectStamp={(text, styleId) => {
            handleAddDecorationToCurrentPage({ type: 'stamp', content: text, color: styleId });
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 4. PRINT-ONLY SPREAD: Rendered exclusively for window.print() (PDF Export) */}
      {/* ========================================================================= */}
      <div className="hidden print:block w-full text-stone-900 bg-white font-sans">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background: white !important;
              color: black !important;
            }
            .no-print {
              display: none !important;
            }
            @page {
              size: A4 portrait;
              margin: 12mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        ` }} />

        {/* 1. FRONT COVER (หน้าปกสมุดพิมพ์) */}
        <div
          className="min-h-[92vh] flex flex-col justify-between items-center text-center p-12 border-8 border-double border-amber-950 rounded-3xl bg-amber-50/20"
          style={{ breakAfter: 'page', pageBreakAfter: 'always' }}
        >
          <div className="pt-10 space-y-4">
            <div className="text-sm font-mono tracking-widest uppercase text-amber-900 border-b border-amber-900/40 pb-2 inline-block">
              AROM LOG • ANNUAL EMOTIONAL JOURNAL
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-amber-950 tracking-wide font-serif pt-4">
              สมุดบันทึกอารมณ์
            </h1>
            <p className="text-xl sm:text-2xl font-bold text-amber-900/90 font-serif">
              ประจำปี พ.ศ. {thaiBuddhistYear} (ค.ศ. {selectedYear})
            </p>
          </div>

          <div className="py-12 space-y-4 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full border-4 border-amber-900/60 bg-amber-100 flex items-center justify-center text-5xl shadow-md overflow-hidden">
              {userProfile.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt={userProfile.displayName}
                  className="w-full h-full object-cover"
                />
              ) : getAvatarEmojiImage(userProfile.avatarEmoji) ? (
                <img
                  src={getAvatarEmojiImage(userProfile.avatarEmoji)!}
                  alt={userProfile.displayName}
                  className="w-full h-full object-contain p-2 select-none"
                  draggable={false}
                />
              ) : (
                <span>{userProfile.avatarEmoji || '😊'}</span>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-amber-950">
                {userProfile.displayName || 'ผู้ใช้งาน'}
              </h2>
              <p className="text-sm text-stone-600 font-mono">
                {userProfile.handle ? `@${userProfile.handle.replace(/^@/, '')}` : `@${userProfile.userId.slice(0, 8)}`}
              </p>
            </div>
          </div>

          <div className="w-full pb-8">
            <div className="grid grid-cols-3 gap-4 border-t-2 border-dashed border-amber-900/30 pt-6 max-w-lg mx-auto text-center">
              <div>
                <div className="text-xs text-amber-900 font-bold">บันทึกทั้งหมด</div>
                <div className="text-xl font-black text-amber-950">{stats.totalDays} วัน</div>
              </div>
              <div>
                <div className="text-xs text-amber-900 font-bold">คะแนนเฉลี่ย</div>
                <div className="text-xl font-black text-amber-950">{stats.averageScore} / 10</div>
              </div>
              <div>
                <div className="text-xs text-amber-900 font-bold">อารมณ์เด่น</div>
                <div className="text-xl font-black text-amber-950 flex items-center justify-center gap-2">
                  {stats.dominantMood?.emojiUrl ? (
                    <img
                      src={stats.dominantMood.emojiUrl}
                      alt={stats.dominantMood.label}
                      className="w-6 h-6 object-contain inline-block"
                    />
                  ) : (
                    <span>{stats.dominantMood?.emoji}</span>
                  )}
                  <span>{stats.dominantMood ? stats.dominantMood.label : '-'}</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-stone-500 font-mono mt-8">
              พิมพ์เมื่อวันที่ {new Date().toLocaleDateString('th-TH')} • จัดทำด้วย Arom Log
            </p>
          </div>
        </div>

        {/* 2. WHOLE YEAR CALENDAR SUMMARY (หน้าสรุปปฏิทินทั้งปี) */}
        <div
          className="min-h-[92vh] flex flex-col justify-between p-6"
          style={{ breakAfter: 'page', pageBreakAfter: 'always' }}
        >
          <div className="space-y-4">
            <div className="border-b-2 border-amber-900/40 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-amber-950 font-serif">
                  สรุปปฏิทินอารมณ์ทั้งปี (Year in Pixels)
                </h2>
                <p className="text-xs text-stone-600">
                  ประจำปี พ.ศ. {thaiBuddhistYear} ({selectedYear})
                </p>
              </div>
              <div className="text-right text-xs text-amber-900 font-bold">
                รวม {stats.totalDays} วันบันทึก
              </div>
            </div>

            {/* 12 Months Mini Grid */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {THAI_MONTHS.map((mName, mIdx) => {
                const daysInM = new Date(selectedYear, mIdx + 1, 0).getDate();
                const mNumStr = String(mIdx + 1).padStart(2, '0');
                return (
                  <div key={mName} className="p-2 border border-stone-300 rounded-xl bg-stone-50/50">
                    <div className="text-[11px] font-black text-amber-950 mb-1 border-b border-stone-200 pb-0.5">
                      {mName}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5 text-center">
                      {['อ','จ','อ','พ','พ','ศ','ส'].map((d, i) => (
                        <span key={i} className="text-[8px] font-bold text-stone-400">{d}</span>
                      ))}
                      {Array.from({ length: daysInM }, (_, i) => i + 1).map((day) => {
                        const dateStr = `${selectedYear}-${mNumStr}-${String(day).padStart(2, '0')}`;
                        const entry = entriesByDate.get(dateStr);
                        const preset = entry ? MOOD_PRESETS.find((p) => p.type === entry.moodType) : null;
                        return (
                          <div
                            key={day}
                            className={`w-4 h-4 rounded text-[8px] flex items-center justify-center font-bold ${
                              preset ? preset.badgeBg || 'bg-amber-200' : 'bg-white text-stone-300 border border-stone-100'
                            }`}
                            title={entry ? `${dateStr}: ${entry.moodLabel}` : undefined}
                          >
                            {day}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-center text-[10px] text-stone-400 font-mono pt-4 border-t border-stone-200">
            Arom Log Journal • หน้าสรุปภาพรวมประจำปี พ.ศ. {thaiBuddhistYear}
          </div>
        </div>

        {/* 3. ALL DAILY ENTRIES (บันทึกรายวันทั้งหมด เรียงจากเก่าไปใหม่) */}
        <div className="space-y-4 pt-2">
          <div className="text-center pb-2 border-b border-stone-300">
            <h3 className="text-xl font-black text-amber-950 font-serif">
              บันทึกเรื่องราวและความรู้สึกรายวัน
            </h3>
            <p className="text-xs text-stone-500">
              เรียงจากวันแรกของปีสู่วันล่าสุด
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {yearEntries.map((entry) => {
              const preset = MOOD_PRESETS.find((p) => p.type === entry.moodType);
              const [y, m, d] = entry.date.split('-').map(Number);
              const monthName = THAI_MONTHS[m - 1] || '';
              const dayOfWeekIdx = new Date(y, m - 1, d).getDay();
              const dayName = THAI_DAYS_MINI[dayOfWeekIdx] || '';
              const dateFormatted = `วัน${dayName}ที่ ${d} ${monthName} พ.ศ. ${y + 543}`;

              return (
                <div
                  key={entry.id || entry.date}
                  style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                  className="p-4 border border-stone-300 rounded-2xl bg-white shadow-2xs flex gap-4 items-start"
                >
                  <div className="w-20 shrink-0 text-center p-2 rounded-xl bg-amber-50 border border-amber-200 flex flex-col items-center">
                    <MoodIcon
                      moodType={entry.moodType}
                      customDrawing={entry.customDrawing}
                      className="w-8 h-8"
                      alt={entry.moodLabel}
                    />
                    <div className="text-xs font-black text-amber-950 mt-1">{d} {THAI_MONTHS_SHORT[m - 1]}</div>
                    <div className="text-[10px] text-amber-800">{entry.moodLabel}</div>
                    <div className="text-[9px] font-bold text-amber-900 mt-0.5">{entry.moodScore}/10</div>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="text-xs font-bold text-stone-700">
                      {dateFormatted}
                    </div>

                    {entry.note ? (
                      <p className="text-xs text-stone-800 leading-relaxed whitespace-pre-wrap bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                        {entry.note}
                      </p>
                    ) : (
                      <p className="text-xs text-stone-400 italic">ไม่ได้เขียนบันทึกข้อความ</p>
                    )}

                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {entry.tags.map((t) => (
                          <span key={t} className="text-[9px] px-1.5 py-0.5 bg-stone-100 border border-stone-200 rounded">
                            {t.startsWith('#') ? t : `#${t}`}
                          </span>
                        ))}
                      </div>
                    )}

                    {entry.customDrawing && (
                      <div className="pt-1">
                        <img
                          src={entry.customDrawing}
                          alt="ภาพวาดอารมณ์"
                          className="w-16 h-16 object-contain rounded-lg border border-stone-200"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

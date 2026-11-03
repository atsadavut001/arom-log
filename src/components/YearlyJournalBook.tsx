import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MoodEntry, UserProfile, MOOD_PRESETS, getAvatarEmojiImage } from '../types.ts';
import { MoodIcon } from './MoodIcon.tsx';
import { playPageTurnSound, playBookCloseSound } from '../utils/audio.ts';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
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
  rose: { bg: 'bg-rose-300', hoverBg: 'hover:bg-rose-400', border: 'border-rose-200', text: 'text-white', name: 'ชมพู' },
  amber: { bg: 'bg-green-300', hoverBg: 'hover:bg-green-400', border: 'border-green-200', text: 'text-slate-700', name: 'เหลือง' },
  emerald: { bg: 'bg-emerald-300', hoverBg: 'hover:bg-emerald-400', border: 'border-emerald-200', text: 'text-white', name: 'เขียว' },
  indigo: { bg: 'bg-indigo-300', hoverBg: 'hover:bg-indigo-400', border: 'border-indigo-200', text: 'text-white', name: 'ฟ้า' },
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

const ENTRIES_PER_PAGE = 5;
const COVER_COLOR_PRESETS = [
  { name: 'ชมพูพาสเทล', color: '#FCE7F3' },
  { name: 'ฟ้ามิ้นต์', color: '#E0F2FE' },
  { name: 'เขียวเซจ', color: '#D1FAE5' },
  { name: 'เหลืองวานิลลา', color: '#FEF3C7' },
  { name: 'ม่วงลาเวนเดอร์', color: '#EDE9FE' },
  { name: 'พีช', color: '#FFEDD5' },
];

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
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [coverColor, setCoverColor] = useState<string>(() => {
    try {
      return localStorage.getItem(`arom_journal_cover_${userProfile.userId}`) || COVER_COLOR_PRESETS[0].color;
    } catch {
      return COVER_COLOR_PRESETS[0].color;
    }
  });

  const monthName = THAI_MONTHS[selectedMonth - 1];
  const monthNameShort = THAI_MONTHS_SHORT[selectedMonth - 1];
  const monthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-`;

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

  // Filter entries for the selected month and sort from oldest to newest.
  const yearEntries = useMemo(() => entries
    .filter((e) => e.date.startsWith(monthPrefix))
    .sort((a, b) => a.date.localeCompare(b.date)), [entries, monthPrefix]);

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

  // Typed date on the calendar page + pending jump for dates in another month
  const [dateInput, setDateInput] = useState<string>('');
  const pendingDateJumpRef = useRef<string | null>(null);
  const entriesRef = useRef<MoodEntry[]>(entries);
  entriesRef.current = entries;

  // Reset page when the selected month changes (or open the page of a pending typed date).
  useEffect(() => {
    const pendingDate = pendingDateJumpRef.current;
    if (pendingDate) {
      pendingDateJumpRef.current = null;
      const [pendingYear, pendingMonth] = pendingDate.split('-');
      const monthEntries = entriesRef.current
        .filter((e) => e.date.startsWith(`${pendingYear}-${pendingMonth}-`))
        .sort((a, b) => a.date.localeCompare(b.date));
      const pendingIndex = monthEntries.findIndex((e) => e.date === pendingDate);
      if (pendingIndex !== -1) {
        setDirection(1);
        setCurrentPage(Math.floor(pendingIndex / ENTRIES_PER_PAGE) + 2);
        return;
      }
    }
    setCurrentPage(1);
    setDirection(1);
  }, [selectedYear, selectedMonth]);

  // 1. Multiple Ribbon Bookmarks state (persistent per user & year)
  const [bookmarks, setBookmarks] = useState<BookmarkRibbon[]>(() => {
    try {
      const raw = localStorage.getItem(`arom_bookmarks_${userProfile.userId}_${selectedYear}_${selectedMonth}`);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [{ page: 1, color: 'rose', label: `หน้า 1: สรุปเดือน${monthName}` }];
  });

  // Reload bookmarks when year or user changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`arom_bookmarks_${userProfile.userId}_${selectedYear}_${selectedMonth}`);
      if (raw) {
        setBookmarks(JSON.parse(raw));
        return;
      }
    } catch {
      // ignore
    }
    setBookmarks([{ page: 1, color: 'rose', label: `หน้า 1: สรุปเดือน${monthName}` }]);
  }, [userProfile.userId, selectedYear, selectedMonth, monthName]);

  const updateCoverColor = (color: string) => {
    setCoverColor(color);
    try {
      localStorage.setItem(`arom_journal_cover_${userProfile.userId}`, color);
    } catch (err) {
      console.error('Failed to save journal cover color:', err);
    }
  };

  const saveBookmarks = (newBookmarks: BookmarkRibbon[]) => {
    setBookmarks(newBookmarks);
    try {
      localStorage.setItem(`arom_bookmarks_${userProfile.userId}_${selectedYear}_${selectedMonth}`, JSON.stringify(newBookmarks));
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
        label = `หน้า 1: สรุปเดือน${monthName}`;
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
      const raw = localStorage.getItem(`arom_scrapbook_pages_${userProfile.userId}_${selectedYear}_${selectedMonth}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`arom_scrapbook_pages_${userProfile.userId}_${selectedYear}_${selectedMonth}`);
      setPageDecorations(raw ? JSON.parse(raw) : {});
    } catch {
      setPageDecorations({});
    }
  }, [userProfile.userId, selectedYear, selectedMonth]);

  const savePageDecorations = (newMap: Record<number, FreeScrapbookItem[]>) => {
    setPageDecorations(newMap);
    try {
      localStorage.setItem(`arom_scrapbook_pages_${userProfile.userId}_${selectedYear}_${selectedMonth}`, JSON.stringify(newMap));
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

  // Jump to the page containing a date, or open the daily entry editor when it is empty.
  const jumpToDatePage = (targetDate: string) => {
    const index = yearEntries.findIndex((e) => e.date === targetDate);
    if (index !== -1) {
      const pageIndex = Math.floor(index / ENTRIES_PER_PAGE) + 2;
      handleTurnPage(Math.min(totalPages, pageIndex));
    } else {
      onSelectDateForEdit?.(targetDate);
    }
  };

  // Go to a typed date: open its page, or the daily editor when that day has no entry yet.
  const handleDateInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateInput) return;
    const [targetYear, targetMonth] = dateInput.split('-').map((part) => parseInt(part, 10));
    if (!targetYear || !targetMonth) return;

    if (targetYear === selectedYear && targetMonth === selectedMonth) {
      jumpToDatePage(dateInput);
      return;
    }

    // Another month: switch the calendar first, then jump once the new month is rendered
    pendingDateJumpRef.current = dateInput;
    setSelectedYear(targetYear);
    setSelectedMonth(targetMonth);
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
  const monthEntriesCount = yearEntries.length;
  const daysInSelectedMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const firstWeekdayOfMonth = new Date(selectedYear, selectedMonth - 1, 1).getDay();

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Top Toolbar: Month/Year Title, Book Status & Controls */}
      <div className="no-print flex flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-3 bg-white/90 backdrop-blur-sm p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Month journal title: full-width row at the top, always a single line */}
        <h3 className="w-full basis-full pb-2 mb-0.5 border-b border-slate-100 font-extrabold text-gray-900 text-[13px] sm:text-base whitespace-nowrap truncate">
          Journal รายเดือน — {monthName} พ.ศ. {thaiBuddhistYear}
        </h3>
        <div className="flex items-center justify-center gap-3">
          <div>
            <p className="text-xs text-gray-500 text-center">
              {isDecorating && (
                <span className="ml-2 font-bold text-slate-600 bg-slate-100/90 border border-slate-300 px-2 py-0.5 rounded-md text-[11px]">
                  🎨 โหมดตกแต่ง Scrapbook เปิดอยู่
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Toolbar Action Buttons: Scrapbook, Print, Month/Year Selector & Open/Close */}
        <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
          {/* Scrapbook Decorate Toggle (Own profile only) */}
          {isOwnProfile && isOpen && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsDecorating(!isDecorating)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-2xs flex items-center gap-1.5 ${
                  isDecorating
                    ? 'bg-slate-500 text-white border-slate-700 shadow-slate-200 ring-2 ring-slate-300'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
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
                  className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-black transition cursor-pointer shadow-2xs flex items-center gap-1 animate-pulse"
                  title="เลือกสติ๊กเกอร์ / เทปวาชิมาวางบนหน้ากระดาษ"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-200" />
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
            title="พิมพ์สมุดประจำเดือนหรือบันทึกเป็นไฟล์ PDF"
          >
            <Printer className="w-3.5 h-3.5 text-stone-600" />
            <span className="hidden sm:inline">พิมพ์สมุด (PDF)</span>
          </button>

          {/* Month Selector Dropdown */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="month-select" className="text-xs font-bold text-gray-600 hidden sm:inline">
              เดือน:
            </label>
            <select
              id="month-select"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(Number(e.target.value));
                setIsOpen(false);
              }}
              className="px-3 py-1.5 rounded-xl border border-pink-200 bg-white text-xs font-bold text-gray-800 shadow-2xs focus:ring-2 focus:ring-pink-300 focus:outline-none cursor-pointer"
            >
              {THAI_MONTHS.map((name, index) => (
                <option key={name} value={index + 1}>{name}</option>
              ))}
            </select>
          </div>

          {/* Year Selector Dropdown */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="year-select" className="text-xs font-bold text-gray-600 hidden sm:inline">
              ปี:
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setIsOpen(false);
              }}
              className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-800 shadow-2xs focus:ring-2 focus:ring-slate-400 focus:outline-none cursor-pointer"
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
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer shadow-2xs flex items-center gap-1.5"
              title="ปิดสมุดและกลับไปหน้าปก"
            >
              <BookMarked className="w-3.5 h-3.5 text-slate-600" />
              <span>ปิดหน้าปก</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenBook}
              className="px-3.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition cursor-pointer shadow-2xs flex items-center gap-1.5 animate-pulse"
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
                className="group relative w-full max-w-lg min-h-[580px] sm:min-h-[640px] md:h-[680px] rounded-xl p-6 sm:p-8 border border-slate-200 shadow-sm cursor-pointer transition-shadow duration-200 hover:shadow-md flex flex-col justify-between select-none overflow-hidden"
                style={{ backgroundColor: coverColor }}
              >
                {/* Minimal cover spine */}
                <div className="absolute inset-y-0 left-0 w-8 sm:w-10 bg-black/5 border-r border-black/5 pointer-events-none" />

                {/* COVER HEADER */}
                <div className="relative z-10 pl-6 sm:pl-8 text-center space-y-2">
                  <div className="text-[11px] font-medium tracking-widest uppercase text-slate-600">
                    Arom Log • Monthly Journal
                  </div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-wide text-slate-800">
                    บันทึกใจของฉัน
                  </h1>
                  <div className="text-sm sm:text-base font-bold tracking-wide text-slate-700">
                    {monthName} พ.ศ. {thaiBuddhistYear}
                  </div>
                </div>

                {/* COVER CENTER: EMBOSSED EMBLEM / GOLD MEDALLION */}
                <div className="relative z-10 pl-6 sm:pl-8 flex flex-col items-center justify-center my-6">
                  <div className="flex flex-col items-center justify-center gap-2">
                    {/* User avatar */}
                    <div
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden flex items-center justify-center text-3xl sm:text-4xl border border-white/80 mb-1.5"
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
                      <div className="text-xs sm:text-sm font-black text-slate-800 truncate max-w-[120px]">
                        {userProfile.displayName}
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono">
                        {userProfile.handle ? `@${userProfile.handle.replace(/^@/, '')}` : `@${userProfile.userId.slice(0, 6)}`}
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-700 italic mt-3 text-center max-w-xs">
                    “เก็บเรื่องราวเล็กๆ และความรู้สึกดีๆ ของเดือนนี้ไว้ด้วยกัน”
                  </p>
                </div>

                {/* Cover color customization */}
                <div
                  data-no-page-turn="true"
                  onClick={(e) => e.stopPropagation()}
                  className="relative z-20 pl-6 sm:pl-8 flex flex-col items-center gap-2"
                >
                  <span className="text-[11px] font-bold text-slate-700">เลือกสีปกสมุด</span>
                  <div className="flex items-center justify-center gap-2">
                    {COVER_COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.color}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateCoverColor(preset.color); }}
                        aria-label={`เลือกสีปก${preset.name}`}
                        aria-pressed={coverColor === preset.color}
                        title={preset.name}
                        className={`w-7 h-7 rounded-full border-2 shadow-sm transition-transform hover:scale-110 ${coverColor === preset.color ? 'border-slate-700 scale-110 ring-2 ring-white' : 'border-white'}`}
                        style={{ backgroundColor: preset.color }}
                      />
                    ))}
                    <label
                      className="w-7 h-7 overflow-hidden rounded-full border-2 border-white shadow-sm cursor-pointer hover:scale-110 transition-transform bg-white"
                      title="เลือกสีปกเอง"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="color"
                        aria-label="เลือกสีปกเอง"
                        value={coverColor}
                        onChange={(e) => updateCoverColor(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-10 h-10 -m-1.5 cursor-pointer"
                      />
                    </label>
                  </div>
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/75 hover:bg-white text-slate-800 font-medium text-xs sm:text-sm border border-white/80 transition-colors">
                    <BookOpen className="w-4 h-4 text-rose-500" />
                    <span>คลิกเพื่อเปิดสมุดประจำเดือน</span>
                    <ChevronRight className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="flex items-center justify-center gap-4 text-[10px] text-slate-700/80 font-mono">
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
              className="w-full relative rounded-xl p-3 sm:p-5 md:p-7 border border-slate-200 shadow-sm"
              style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d', backgroundColor: coverColor }}
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
                className="relative w-full min-h-[640px] md:h-[720px] rounded-lg bg-white text-gray-800 border border-slate-200 flex flex-col justify-between overflow-hidden cursor-default select-text"
                title={isDecorating ? "🎨 โหมดตกแต่งสมุด (ลากวาง/ขยาย/หมุนสติ๊กเกอร์ได้อิสระ • ปิดการแตะเปลี่ยนหน้า)" : "คลิกฝั่งซ้ายของกระดาษเพื่อย้อนกลับ • คลิกฝั่งขวาเพื่อไปหน้าถัดไป"}
              >


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
                    className="absolute left-1 sm:left-2.5 top-1/2 -translate-y-1/2 z-30 group/prev-tab px-1.5 py-4 sm:px-2 sm:py-5 rounded-2xl bg-slate-700/10 hover:bg-slate-600/25 active:scale-95 transition-all text-slate-800 backdrop-blur-xs border border-slate-700/15 shadow-sm flex flex-col items-center justify-center gap-1 cursor-pointer"
                    title={currentPage <= 1 ? "คลิกฝั่งซ้ายเพื่อปิดสมุด (หน้าปก)" : "คลิกฝั่งซ้ายเพื่อย้อนกลับ (หน้าก่อนหน้า)"}
                    aria-label={currentPage <= 1 ? "ปิดสมุด" : "หน้าก่อนหน้า"}
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-700 group-hover/prev-tab:-translate-x-0.5 transition-transform" />
                    <span className="[writing-mode:vertical-rl] text-[9px] font-bold text-slate-700/80 tracking-widest hidden md:inline select-none">
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
                    className="absolute right-1 sm:right-2.5 top-1/2 -translate-y-1/2 z-30 group/next-tab px-1.5 py-4 sm:px-2 sm:py-5 rounded-2xl bg-slate-700/10 hover:bg-slate-600/25 active:scale-95 transition-all text-slate-800 backdrop-blur-xs border border-slate-700/15 shadow-sm flex flex-col items-center justify-center gap-1 cursor-pointer"
                    title="คลิกฝั่งขวาเพื่อเปิดหน้าถัดไป"
                    aria-label="หน้าถัดไป"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-700 group-hover/next-tab:translate-x-0.5 transition-transform" />
                    <span className="[writing-mode:vertical-rl] text-[9px] font-bold text-slate-700/80 tracking-widest hidden md:inline select-none">
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
                        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-900/5 to-transparent rounded-xl z-20"
                      />

                      {currentPage === 1 ? (
                /* ========================================================================= */
                /* PAGE 1: ปฏิทินอารมณ์ประจำเดือน */
                /* ========================================================================= */
                <div className="space-y-5 animate-in fade-in duration-300 flex-1 flex flex-col">
                  {/* Book Header Stamp */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase text-slate-600 bg-slate-100/80 px-2.5 py-0.5 rounded-full border border-slate-200">
                            หน้า 1 • ปฏิทินอารมณ์ประจำเดือน
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
                                : 'bg-white hover:bg-slate-50 text-stone-600 border-slate-200'
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
                        <h2 className="text-lg sm:text-2xl font-black text-slate-800 mt-1">
                          {monthName} พ.ศ. {thaiBuddhistYear}
                        </h2>
                      </div>
                  </div>

                  {/* Selected month calendar */}
                  <div className="flex-1 flex flex-col justify-center max-w-xl w-full mx-auto">
                    <div className="flex items-center justify-between mb-3 px-2">
                      <h3 className="text-lg sm:text-xl font-black text-slate-800">{monthName} {thaiBuddhistYear}</h3>
                      <span className="text-xs font-bold text-stone-500">บันทึกแล้ว {monthEntriesCount} วัน</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
                      {THAI_DAYS_MINI.map((day, index) => (
                        <div key={`${day}-${index}`} className="py-1 text-[10px] sm:text-xs font-bold text-stone-500">{day}</div>
                      ))}
                      {Array.from({ length: firstWeekdayOfMonth }).map((_, index) => (
                        <div key={`empty-${index}`} className="aspect-square" />
                      ))}
                      {Array.from({ length: daysInSelectedMonth }, (_, index) => index + 1).map((day) => {
                        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const entry = entriesByDate.get(dateStr);
                        return (
                          <button
                            key={dateStr}
                            type="button"
                            onClick={(event) => { event.stopPropagation(); jumpToDatePage(dateStr); }}
                            data-no-page-turn="true"
                            className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-0.5 border-0 bg-transparent shadow-none outline-none focus:outline-none focus-visible:outline-none appearance-none transition hover:scale-105 cursor-pointer ${entry ? 'text-stone-800' : 'text-stone-400 hover:text-stone-600'}`}
                            title={entry ? `${day} ${monthNameShort}: ${entry.moodLabel} — ${entry.note || ''}` : `เพิ่มบันทึกวันที่ ${day} ${monthNameShort}`}
                          >
                            <span className="text-xs sm:text-sm font-bold">{day}</span>
                            {entry && <MoodIcon moodType={entry.moodType} customDrawing={entry.customDrawing} className="w-7 h-7" alt={entry.moodLabel} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* ========================================================================= */
                /* PAGES 2+: บันทึกอารมณ์ประจำวัน (Daily Mood Entries — เก่าไปใหม่)         */
                /* ========================================================================= */
                <div className="space-y-4 animate-in fade-in duration-300 flex-1 flex flex-col justify-between">
                  {/* Page Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase text-slate-600 bg-slate-100/90 px-3 py-0.5 rounded-full border border-slate-200">
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
                            : 'bg-white hover:bg-slate-50 text-stone-600 border-slate-200'
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
                        บันทึกอารมณ์เดือน{monthName} {thaiBuddhistYear}
                      </span>
                    </div>

                    <div className="flex items-center gap-2" data-no-page-turn="true">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTurnPage(1);
                        }}
                        className="text-xs font-bold text-slate-600 hover:text-slate-800 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>ปฏิทินเดือน{monthName}</span>
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

                  {/* Entry Cards List for this Page (Fixed count: 5 entries per page) */}
                  <div className="space-y-2.5 flex-1">
                    {entryPages[currentPage - 2]?.map((entry) => {
                      const [y, m, d] = entry.date.split('-').map(Number);
                      const monthName = THAI_MONTHS[m - 1] || '';
                      const dayOfWeekIdx = new Date(y, m - 1, d).getDay();
                      const dayName = THAI_DAYS_MINI[dayOfWeekIdx] || '';
                      const dateFormatted = `วัน${dayName}ที่ ${d} ${monthName} พ.ศ. ${y + 543}`;

                      return (
                        <div
                          key={entry.id || entry.date}
                          data-no-page-turn="true"
                          className="rounded-lg p-3 sm:p-3.5 transition-colors relative group"
                        >
                          <div className="flex-1 min-w-0">
                            {/* Line 1: วันที่ เดือน พ.ศ. */}
                            <div
                              className="text-sm sm:text-base font-black text-stone-900 leading-tight"
                              title={dateFormatted}
                            >
                              วันที่ {d} {monthName} พ.ศ. {y + 543}
                            </div>

                            {/* Line 2: ข้อความที่บันทึก */}
                            {entry.note ? (
                              <p className="mt-1 text-xs sm:text-[13px] text-gray-800 leading-relaxed font-sans whitespace-pre-wrap">
                                {entry.note}
                              </p>
                            ) : (
                              <p className="mt-1 text-xs text-stone-400 italic">
                                ไม่ได้เขียนบันทึกข้อความสำหรับวันนี้
                              </p>
                            )}

                            {/* Line 3: emoji + คำอธิบายอารมณ์ + #แท็ก */}
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <MoodIcon
                                moodType={entry.moodType}
                                customDrawing={entry.customDrawing}
                                className="w-5 h-5"
                                imgClassName="!rounded-none !border-0 !bg-transparent !shadow-none"
                                alt={entry.moodLabel}
                              />
                              <span className="text-xs font-bold text-stone-700">{entry.moodLabel}</span>
                              {entry.tags && entry.tags.length > 0 && entry.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-stone-100 text-stone-700"
                                >
                                  {tag.startsWith('#') ? tag : `#${tag}`}
                                </span>
                              ))}
                            </div>

                            {/* Custom Drawing or Photo Thumbnail if exists */}
                            {(entry.customDrawing || entry.photoUrl) && (
                              <div className="flex items-center gap-2 pt-1">
                                {entry.customDrawing && (
                                  <div className="p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
                                    <img
                                      src={entry.customDrawing}
                                      alt="ภาพวาดอารมณ์"
                                      className="w-14 h-14 object-contain rounded-lg bg-slate-50/50"
                                    />
                                  </div>
                                )}
                                {entry.photoUrl && (
                                  <div className="p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
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
                                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[11px] font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                                >
                                  <Sparkles className="w-3 h-3 text-slate-600" />
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
                    - Arom Log Journal • ประจำเดือน{monthName} {thaiBuddhistYear} -
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* BOOK BOTTOM CONTROLS & NAVIGATION BAR (Page Turner) */}
        <div data-no-page-turn="true" className="relative z-10 px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-3 text-xs font-medium text-slate-700 select-none">
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
            className="px-3 sm:px-4 py-2 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
            <span>{currentPage <= 1 ? 'ปิดสมุด (หน้าปก)' : 'หน้าก่อนหน้า'}</span>
          </button>

          {/* Page Indicator & Click Hints */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/90 border border-slate-300 shadow-2xs font-mono text-xs">
              หน้า {currentPage} / {totalPages}
            </span>
            {isDecorating ? (
              <span className="text-[10px] sm:text-xs text-slate-700 font-bold flex items-center gap-1 bg-slate-200/80 px-2.5 py-1 rounded-full border border-slate-400/60 shadow-2xs">
                🎨 กำลังอยู่ในโหมดตกแต่งสมุด (ปิดการเปลี่ยนหน้าชั่วคราว)
              </span>
            ) : (
              <span className="text-[10px] text-slate-700/60 hidden sm:inline font-medium">
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
            className="px-3 sm:px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
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
          className="min-h-[92vh] flex flex-col justify-between items-center text-center p-12 border-8 border-double border-white rounded-2xl"
          style={{ breakAfter: 'page', pageBreakAfter: 'always', backgroundColor: coverColor }}
        >
          <div className="pt-10 space-y-4">
            <div className="text-sm font-mono tracking-widest uppercase text-slate-700 border-b border-slate-700/40 pb-2 inline-block">
              AROM LOG • MONTHLY EMOTIONAL JOURNAL
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-slate-800 tracking-wide font-serif pt-4">
              สมุดบันทึกอารมณ์
            </h1>
            <p className="text-xl sm:text-2xl font-bold text-slate-700/90 font-serif">
              ประจำเดือน{monthName} พ.ศ. {thaiBuddhistYear}
            </p>
          </div>

          <div className="py-12 space-y-4 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full border-4 border-slate-700/60 bg-slate-100 flex items-center justify-center text-5xl shadow-md overflow-hidden">
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
              <h2 className="text-2xl font-bold text-slate-800">
                {userProfile.displayName || 'ผู้ใช้งาน'}
              </h2>
              <p className="text-sm text-stone-600 font-mono">
                {userProfile.handle ? `@${userProfile.handle.replace(/^@/, '')}` : `@${userProfile.userId.slice(0, 8)}`}
              </p>
            </div>
          </div>

          <div className="w-full pb-8">
            <div className="grid grid-cols-3 gap-4 border-t-2 border-dashed border-slate-700/30 pt-6 max-w-lg mx-auto text-center">
              <div>
                <div className="text-xs text-slate-700 font-bold">บันทึกเดือนนี้</div>
                <div className="text-xl font-black text-slate-800">{stats.totalDays} วัน</div>
              </div>
              <div>
                <div className="text-xs text-slate-700 font-bold">คะแนนเฉลี่ย</div>
                <div className="text-xl font-black text-slate-800">{stats.averageScore} / 10</div>
              </div>
              <div>
                <div className="text-xs text-slate-700 font-bold">อารมณ์เด่น</div>
                <div className="text-xl font-black text-slate-800 flex items-center justify-center gap-2">
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

        {/* 2. MONTHLY CALENDAR SUMMARY */}
        <div
          className="min-h-[92vh] flex flex-col justify-between p-6"
          style={{ breakAfter: 'page', pageBreakAfter: 'always' }}
        >
          <div className="space-y-4">
            <div className="border-b-2 border-slate-700/40 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-800 font-serif">
                  ปฏิทินอารมณ์ประจำเดือน{monthName}
                </h2>
                <p className="text-xs text-stone-600">
                  ประจำเดือน{monthName} พ.ศ. {thaiBuddhistYear}
                </p>
              </div>
              <div className="text-right text-xs text-slate-700 font-bold">
                รวม {stats.totalDays} วันบันทึก
              </div>
            </div>

            {/* Selected month's calendar */}
            <div className="max-w-2xl mx-auto w-full pt-2">
              <div className="grid grid-cols-7 gap-1 text-center">
                {THAI_DAYS_MINI.map((day, index) => (
                  <span key={`${day}-${index}`} className="py-2 text-xs font-bold text-stone-500">{day}</span>
                ))}
                {Array.from({ length: firstWeekdayOfMonth }).map((_, index) => (
                  <span key={`empty-${index}`} />
                ))}
                {Array.from({ length: daysInSelectedMonth }, (_, index) => index + 1).map((day) => {
                  const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const entry = entriesByDate.get(dateStr);
                  return (
                    <div
                      key={day}
                      className={`h-10 rounded-lg text-xs flex items-center justify-center font-bold ${entry ? 'text-stone-800' : 'text-stone-400'}`}
                      title={entry ? `${dateStr}: ${entry.moodLabel}` : undefined}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="text-center text-[10px] text-stone-400 font-mono pt-4 border-t border-stone-200">
            Arom Log Journal • ปฏิทินเดือน{monthName} พ.ศ. {thaiBuddhistYear}
          </div>
        </div>

        {/* 3. ALL DAILY ENTRIES (บันทึกรายวันทั้งหมด เรียงจากเก่าไปใหม่) */}
        <div className="space-y-4 pt-2">
          <div className="text-center pb-2 border-b border-stone-300">
            <h3 className="text-xl font-black text-slate-800 font-serif">
              บันทึกเรื่องราวและความรู้สึกรายวัน
            </h3>
            <p className="text-xs text-stone-500">
              บันทึกประจำเดือน{monthName} เรียงจากวันแรกสู่วันล่าสุด
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
                  <div className="w-20 shrink-0 text-center p-2 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center">
                    <MoodIcon
                      moodType={entry.moodType}
                      customDrawing={entry.customDrawing}
                      className="w-8 h-8"
                      alt={entry.moodLabel}
                    />
                    <div className="text-xs font-black text-slate-800 mt-1">{d} {THAI_MONTHS_SHORT[m - 1]}</div>
                    <div className="text-[10px] text-slate-600">{entry.moodLabel}</div>
                    <div className="text-[9px] font-bold text-slate-700 mt-0.5">{entry.moodScore}/10</div>
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

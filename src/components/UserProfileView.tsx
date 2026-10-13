import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
  increment,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase.ts';
import { UserProfile, MoodEntry, MOOD_PRESETS, SCALE_0_10_LEVELS } from '../types.ts';
import { CalendarView } from './CalendarView.tsx';
import {
  Calendar as CalendarIcon,
  FileText,
  Heart,
  UserCheck,
  UserPlus,
  Flame,
  Edit3,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Smile,
  Copy,
  Check,
  X,
  Loader2,
  Share2,
  Tag,
  AtSign,
  ShieldCheck,
  Award,
  Lock,
  Users
} from 'lucide-react';

interface UserProfileViewProps {
  userProfile: UserProfile;
  currentUser: User;
  isOwnProfile: boolean;
  ownEntries?: MoodEntry[];
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  onUpdateOwnProfile?: (updatedData: Partial<UserProfile>) => Promise<void>;
  onBack?: () => void;
  onSelectDateForEdit?: (dateStr: string) => void;
}

// Curated list of friendly, privacy-protecting emojis for avatars
const EMOJI_AVATAR_OPTIONS = [
  '😊', '🥰', '😌', '🤩', '😎', '🥳',
  '🐱', '🦊', '🐼', '🐰', '🐻', '🦁',
  '🐯', '🐨', '🐸', '🐙', '🥑', '🌸',
  '🌻', '🍀', '☁️', '🌈', '🌟', '☕',
  '🎨', '🧘', '🪴', '🌙', '🧸', '🐬',
  '🐧', '🦥', '🦄', '🚀', '🦋', '🎈'
];

// Curated pastel background colors for avatar circle
const AVATAR_BG_OPTIONS = [
  { name: 'เหลืองละมุน', color: '#FEF3C7', border: '#FCD34D' },
  { name: 'ส้มพีช', color: '#FFEDD5', border: '#FDBA74' },
  { name: 'ชมพูกุหลาบ', color: '#FFE4E6', border: '#FDA4AF' },
  { name: 'เขียวมินต์', color: '#D1FAE5', border: '#6EE7B7' },
  { name: 'ฟ้าคราม', color: '#E0F2FE', border: '#7DD3FC' },
  { name: 'ม่วงลาเวนเดอร์', color: '#EDE9FE', border: '#C4B5FD' },
  { name: 'ชมพูพาสเทล', color: '#FCE7F3', border: '#F472B6' },
  { name: 'เทาสะอาด', color: '#F1F5F9', border: '#CBD5E1' },
];

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  userProfile,
  currentUser,
  isOwnProfile,
  ownEntries,
  selectedMonth: propSelectedMonth,
  onMonthChange,
  onUpdateOwnProfile,
  onBack,
  onSelectDateForEdit,
}) => {
  // Tabs: 'posts' is primary/default, 'calendar' is secondary
  const [activeTab, setActiveTab] = useState<'posts' | 'calendar'>('posts');
  const [entries, setEntries] = useState<MoodEntry[]>(ownEntries || []);
  const [loadingEntries, setLoadingEntries] = useState<boolean>(!ownEntries);

  // Follow state
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);

  // Calendar month state: synchronized with parent if provided
  const [internalMonth, setInternalMonth] = useState<string>(
    propSelectedMonth || new Date().toISOString().substring(0, 7)
  );
  const currentSelectedMonth = propSelectedMonth || internalMonth;
  const handleCalendarMonthChange = (newMonth: string) => {
    if (onMonthChange) {
      onMonthChange(newMonth);
    }
    setInternalMonth(newMonth);
  };

  // Edit Profile Modal state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editDisplayName, setEditDisplayName] = useState<string>(userProfile.displayName || '');
  const [editAvatarEmoji, setEditAvatarEmoji] = useState<string>(userProfile.avatarEmoji || '😊');
  const [editAvatarBg, setEditAvatarBg] = useState<string>(userProfile.avatarBg || '#FEF3C7');
  const [editHandle, setEditHandle] = useState<string>(
    userProfile.handle ? userProfile.handle.replace(/^@/, '') : userProfile.userId.substring(0, 8)
  );
  const [editBio, setEditBio] = useState<string>(userProfile.bio || '');
  const [editIsPrivate, setEditIsPrivate] = useState<boolean>(userProfile.isPrivate === true);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [copiedHandle, setCopiedHandle] = useState<boolean>(false);
  const [handleError, setHandleError] = useState<string>('');

  // 1. Real-time subscription to user's entries (or use ownEntries if viewing own profile)
  useEffect(() => {
    if (isOwnProfile && ownEntries) {
      setEntries(ownEntries);
      setLoadingEntries(false);
      return;
    }

    setLoadingEntries(true);
    const targetUserId = userProfile.userId;
    const entriesColRef = collection(db, 'users', targetUserId, 'entries');

    const unsubscribe = onSnapshot(
      entriesColRef,
      (snapshot) => {
        const list: MoodEntry[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as MoodEntry);
        });
        list.sort((a, b) => b.date.localeCompare(a.date));
        setEntries(list);
        setLoadingEntries(false);
      },
      (err) => {
        console.warn('Error reading entries in UserProfileView:', err);
        setLoadingEntries(false);
      }
    );

    return () => unsubscribe();
  }, [userProfile.userId, isOwnProfile, ownEntries]);

  // 2. Fetch following status and follower count
  useEffect(() => {
    if (isOwnProfile) return;

    // Check if currentUser follows this user
    const checkFollowRef = doc(db, 'users', currentUser.uid, 'following', userProfile.userId);
    const unsub = onSnapshot(checkFollowRef, (snap) => {
      setIsFollowing(snap.exists());
    });

    return () => unsub();
  }, [currentUser.uid, userProfile.userId, isOwnProfile]);

  // Count followers across users
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Fetch own followings
        const followingSnap = await getDocs(
          collection(db, 'users', userProfile.userId, 'following')
        );
        setFollowingCount(followingSnap.size);
      } catch (e) {
        console.warn('Could not load following count:', e);
      }
    };
    fetchCounts();
  }, [userProfile.userId]);

  // 3. Follow / Unfollow toggle
  const handleToggleFollow = async () => {
    if (isOwnProfile) return;
    const followDocRef = doc(db, 'users', currentUser.uid, 'following', userProfile.userId);

    try {
      if (isFollowing) {
        await setDoc(followDocRef, { deleted: true });
        // Actually delete doc
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(followDocRef);
        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(0, prev - 1));
      } else {
        await setDoc(followDocRef, {
          followerId: currentUser.uid,
          followedUserId: userProfile.userId,
          createdAt: new Date().toISOString(),
        });
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    }
  };

  // 4. Toggle heart like on an entry (with optimistic UI update)
  const handleToggleLike = async (entry: MoodEntry) => {
    const isLiked = (entry.likes || []).includes(currentUser.uid);
    const entryDocRef = doc(db, 'users', userProfile.userId, 'entries', entry.id);

    // Optimistic state update
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entry.id) return e;
        const curLikes = e.likes || [];
        const nextLikes = isLiked
          ? curLikes.filter((uid) => uid !== currentUser.uid)
          : [...curLikes, currentUser.uid];
        return {
          ...e,
          likes: nextLikes,
          likesCount: nextLikes.length,
        };
      })
    );

    try {
      if (isLiked) {
        await updateDoc(entryDocRef, {
          likes: arrayRemove(currentUser.uid),
          likesCount: increment(-1),
        });
      } else {
        await updateDoc(entryDocRef, {
          likes: arrayUnion(currentUser.uid),
          likesCount: increment(1),
        });
      }
    } catch (err) {
      console.error('Failed to toggle heart:', err);
    }
  };

  // 5. Save edited profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setHandleError('');

    const cleanHandle = editHandle.trim().replace(/^@/, '').toLowerCase();
    if (!cleanHandle) {
      setHandleError('กรุณาระบุ @ID สำหรับค้นหา');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanHandle)) {
      setHandleError('@ID ต้องเป็นภาษาอังกฤษ ตัวเลข หรือ _ ความยาว 3-20 ตัวอักษร');
      return;
    }
    if (!editDisplayName.trim()) {
      setHandleError('กรุณาระบุชื่อที่แสดง');
      return;
    }

    setIsSavingProfile(true);
    try {
      const nowIso = new Date().toISOString();
      const updatedFields: Partial<UserProfile> = {
        displayName: editDisplayName.trim(),
        avatarEmoji: editAvatarEmoji,
        avatarBg: editAvatarBg,
        handle: cleanHandle,
        bio: editBio.trim(),
        isPrivate: editIsPrivate,
        updatedAt: nowIso,
      };

      if (onUpdateOwnProfile) {
        await onUpdateOwnProfile(updatedFields);
      } else {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, updatedFields);
      }

      setIsEditing(false);
    } catch (err: any) {
      console.error('Save profile error:', err);
      setHandleError('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const copyHandleToClipboard = () => {
    const currentHandle = userProfile.handle || userProfile.userId.substring(0, 8);
    const textToCopy = `@${currentHandle.replace(/^@/, '')}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedHandle(true);
    setTimeout(() => setCopiedHandle(false), 2000);
  };

  const formatDateThai = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const thaiMonthsShort = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    return `${d} ${thaiMonthsShort[m - 1]} ${y + 543}`;
  };

  // Active user's displayed emoji and background
  const displayEmoji = userProfile.avatarEmoji || '😊';
  const displayBg = userProfile.avatarBg || '#FEF3C7';
  const displayHandle = userProfile.handle
    ? `@${userProfile.handle.replace(/^@/, '')}`
    : `@${userProfile.userId.substring(0, 8)}`;

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in pb-12">
      {/* Top Navigation Back bar if viewing another user */}
      {onBack && !isOwnProfile && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition cursor-pointer shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>กลับไปรายชื่อเพื่อน</span>
          </button>
        </div>
      )}

      {/* 1. PROFILE HEADER CARD */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-amber-200/70 shadow-sm relative overflow-hidden">
        {/* Soft background gradient glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 bg-amber-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-orange-100/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6">
          {/* Privacy-Friendly Emoji Avatar Circle */}
          <div className="relative shrink-0">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-4xl sm:text-5xl shadow-md border-4 border-white ring-2 ring-amber-200/80 transition-transform hover:scale-105"
              style={{ backgroundColor: displayBg }}
            >
              <span className="select-none filter drop-shadow-xs">{displayEmoji}</span>
            </div>

            {/* If own profile: quick edit badge on avatar */}
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="absolute -bottom-1 -right-1 p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-md border-2 border-white transition cursor-pointer"
                title="เปลี่ยนรูป Emoji หรือแก้ไขโปรไฟล์"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* User Details & Meta */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                    {userProfile.displayName || 'ผู้ใช้งานไม่ระบุชื่อ'}
                  </h2>
                  {isOwnProfile && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-full border border-amber-200">
                      คุณ
                    </span>
                  )}
                  {userProfile.isPrivate === true && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-800 text-white text-[10px] font-bold rounded-full">
                      <Lock className="w-2.5 h-2.5 fill-white text-white" />
                      ส่วนตัว
                    </span>
                  )}
                </div>

                {/* @ID Handle badge with copy feature */}
                <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                  <span className="text-xs sm:text-sm font-bold text-amber-900/80 font-mono bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200/60 inline-flex items-center gap-1">
                    <AtSign className="w-3 h-3 text-amber-600" />
                    {displayHandle.replace(/^@/, '')}
                  </span>
                  <button
                    type="button"
                    onClick={copyHandleToClipboard}
                    className="p-1 text-gray-400 hover:text-amber-700 hover:bg-amber-100/50 rounded-md transition cursor-pointer"
                    title="คัดลอก @ID ไว้ส่งให้เพื่อนค้นหา"
                  >
                    {copiedHandle ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Action Button: Edit Profile (Own) or Follow/Unfollow (Other) */}
              <div className="shrink-0">
                {isOwnProfile ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs w-full sm:w-auto"
                  >
                    <Edit3 className="w-4 h-4 text-amber-700" />
                    <span>แก้ไขโปรไฟล์</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleToggleFollow}
                    className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs w-full sm:w-auto ${
                      isFollowing
                        ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                        <span>กำลังติดตาม</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>ติดตาม</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Bio / Status text */}
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-xl">
              {userProfile.bio || 'กำลังดูแลสุขภาพใจและบันทึกอารมณ์ในทุกๆ วัน 🌱'}
            </p>

            {/* Quick Stats: Streak, Posts, Following */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-4 pt-2">
              {userProfile.streak !== undefined && userProfile.streak > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 border border-orange-200 rounded-full text-orange-800 text-xs font-bold shadow-2xs">
                  <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                  <span>บันทึกต่อเนื่อง {userProfile.streak} วัน</span>
                </div>
              )}

              <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                <FileText className="w-3.5 h-3.5 text-gray-500" />
                <span>
                  <strong>{entries.length}</strong> โพสต์
                </span>
              </div>

              {followingCount > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                  <span>กำลังติดตาม <strong>{followingCount}</strong> คน</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. TABS SECTION (โพสต์เป็นหลัก และมี tap ปฏิทิน) */}
      <div className="flex items-center justify-center sm:justify-start gap-2 border-b border-gray-200/80 pb-2">
        {/* Tab 1: Posts (Primary Default) */}
        <button
          type="button"
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'posts'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>โพสต์ ({entries.length})</span>
        </button>

        {/* Tab 2: Calendar */}
        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'calendar'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>ปฏิทิน</span>
        </button>
      </div>

      {/* 3. CONTENT AREA */}

      {/* TAB A: POSTS STREAM (DEFAULT) */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {loadingEntries ? (
            <div className="py-16 flex flex-col items-center justify-center text-gray-400 gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
              <span className="text-xs">กำลังโหลดโพสต์...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-gray-200/80 p-6 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center text-2xl">
                📝
              </div>
              <h4 className="text-base font-bold text-gray-800">ยังไม่มีโพสต์บันทึก</h4>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                {isOwnProfile
                  ? 'คุณยังไม่ได้บันทึกอารมณ์ประจำวัน ลองไปที่เมนู "บันทึกวันนี้" เพื่อสร้างโพสต์แรกของคุณ'
                  : 'ผู้ใช้คนนี้ยังไม่มีบันทึกอารมณ์ที่แชร์ไว้'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => {
                const isLikedByMe = (entry.likes || []).includes(currentUser.uid);
                const likesCount = entry.likesCount || (entry.likes || []).length || 0;
                const preset = MOOD_PRESETS.find((p) => p.type === entry.moodType);
                const scaleItem = SCALE_0_10_LEVELS.find((s) => s.score === entry.moodScore);

                return (
                  <div
                    key={entry.id}
                    className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-2xs hover:shadow-sm transition space-y-4"
                  >
                    {/* Post Card Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Author Emoji Avatar */}
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-xs border border-white"
                          style={{ backgroundColor: displayBg }}
                        >
                          {displayEmoji}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-black text-gray-900">
                              {userProfile.displayName}
                            </span>
                            <span className="text-[11px] text-gray-400 font-mono">
                              {displayHandle}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-400 block">
                            {formatDateThai(entry.date)}
                          </span>
                        </div>
                      </div>

                      {/* Mood score badge */}
                      <div
                        className="px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-2xs"
                        style={{
                          backgroundColor: preset?.bgLight || scaleItem?.bgLight || '#FEF3C7',
                          borderColor: preset?.borderColor || scaleItem?.borderColor || '#FCD34D',
                          color: entry.moodColor || preset?.color || '#D97706',
                        }}
                      >
                        {entry.customDrawing ? (
                          <img
                            src={entry.customDrawing}
                            alt="Mood"
                            className="w-4 h-4 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm">
                            {preset?.emoji || scaleItem?.emoji || '😊'}
                          </span>
                        )}
                        <span>{entry.moodLabel}</span>
                        {entry.moodScore !== undefined && (
                          <span className="text-[10px] opacity-80 font-mono">
                            ({entry.moodScore}/10)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Note / Content */}
                    {entry.note ? (
                      <p className="text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-wrap bg-stone-50/70 p-3.5 rounded-2xl border border-stone-200/60">
                        {entry.note}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        บันทึกความรู้สึกประจำวันโดยไม่มีข้อความบรรยาย
                      </p>
                    )}

                    {/* Custom Drawing / Photo if attached */}
                    {entry.photoUrl && (
                      <div className="rounded-2xl overflow-hidden border border-gray-200 max-h-80 bg-black/5">
                        <img
                          src={entry.photoUrl}
                          alt="Post attachment"
                          className="w-full h-full object-contain max-h-80"
                        />
                      </div>
                    )}

                    {/* Tags */}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {entry.tags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200/60"
                          >
                            <Tag className="w-2.5 h-2.5 text-amber-600" />
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer: Heart button (No chat/comments) */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleToggleLike(entry)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer active:scale-95 ${
                          isLikedByMe
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'bg-gray-50 text-gray-600 hover:bg-rose-50/60 hover:text-rose-600 border border-gray-200'
                        }`}
                        title="กดหัวใจให้กำลังใจ"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isLikedByMe ? 'fill-rose-500 text-rose-500' : 'text-gray-400'
                          }`}
                        />
                        <span>{likesCount} กำลังใจ</span>
                      </button>

                      {isOwnProfile && onSelectDateForEdit && (
                        <button
                          type="button"
                          onClick={() => onSelectDateForEdit(entry.date)}
                          className="text-[11px] font-bold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          แก้ไขบันทึกนี้
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB B: CALENDAR VIEW (แสดงเฉพาะเดือนปัจจุบัน, ชื่อ ปฏิทินของ{NAME}, ซ่อนสัญลักษณ์อารมณ์) */}
      {activeTab === 'calendar' && (
        <CalendarView
          entries={entries}
          selectedMonth={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}
          onMonthChange={handleCalendarMonthChange}
          onSelectDateForEdit={isOwnProfile ? onSelectDateForEdit : undefined}
          readOnly={!isOwnProfile}
          userName={userProfile.displayName || userProfile.handle || 'ผู้ใช้งาน'}
          title={`ปฏิทินของ${userProfile.displayName || userProfile.handle || 'ผู้ใช้งาน'}`}
          subtitle=""
          hideReminderBanner={true}
          hideMonthNavigation={true}
          hideLegend={true}
          currentUser={currentUser}
          onToggleLike={handleToggleLike}
        />
      )}

      {/* 4. EDIT OWN PROFILE MODAL (ถ้าเป็นหน้า profile ตัวเองสามารถแก้ไขชื่อ, รูป Emoji และ @ID) */}
      {isEditing && isOwnProfile && (
        <div
          onClick={() => setIsEditing(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-amber-200 my-auto p-5 sm:p-7 space-y-5 max-h-[92vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg">
                  ✏️
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-gray-900 leading-tight">
                    แก้ไขโปรไฟล์โซเชียลมีเดีย
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    รูปโปรไฟล์เป็น Emoji เพื่อรักษาความเป็นส่วนตัว
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition cursor-pointer"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner */}
            {handleError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{handleError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Live Preview Avatar */}
              <div className="flex flex-col items-center justify-center p-4 bg-amber-50/60 border border-amber-200/70 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-amber-900">ตัวอย่างรูปโปรไฟล์ Emoji</span>
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-md border-4 border-white ring-2 ring-amber-300 transition-transform"
                  style={{ backgroundColor: editAvatarBg }}
                >
                  <span className="select-none filter drop-shadow-xs">{editAvatarEmoji}</span>
                </div>
                <span className="text-[11px] text-gray-500">
                  @{editHandle ? editHandle.replace(/^@/, '') : 'id'}
                </span>
              </div>

              {/* 1. Emoji Selection Grid */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Smile className="w-4 h-4 text-amber-600" />
                  <span>เลือกรูป Emoji ประจำตัว</span>
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 bg-gray-50 p-2.5 rounded-2xl border border-gray-200 max-h-36 overflow-y-auto">
                  {EMOJI_AVATAR_OPTIONS.map((emoji) => {
                    const isSelected = editAvatarEmoji === emoji;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setEditAvatarEmoji(emoji)}
                        className={`aspect-square rounded-xl text-xl flex items-center justify-center transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-300 shadow-xs ring-2 ring-amber-500 scale-110'
                            : 'hover:bg-white hover:scale-105'
                        }`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Avatar Background Color Palette */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">
                  สีพื้นหลังของรูปโปรไฟล์
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_BG_OPTIONS.map((bg) => {
                    const isSelected = editAvatarBg === bg.color;
                    return (
                      <button
                        key={bg.name}
                        type="button"
                        onClick={() => setEditAvatarBg(bg.color)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                          isSelected ? 'ring-2 ring-amber-500 shadow-xs' : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: bg.color,
                          borderColor: bg.border,
                        }}
                      >
                        <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: bg.border }} />
                        <span className="text-gray-800">{bg.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Display Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">
                  ชื่อที่แสดง (Display Name) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="เช่น มะนาวหวาน, Sky Walker"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-white"
                />
              </div>

              {/* 4. @ID Handle for searching and adding friends */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <AtSign className="w-3.5 h-3.5 text-amber-600" />
                  <span>@ID สำหรับค้นหาเพื่อเพิ่มเพื่อน <span className="text-red-500">*</span></span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-gray-400 font-mono font-bold text-sm">
                    @
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={editHandle}
                    onChange={(e) => {
                      // Allow only alphanumeric and underscores
                      const sanitized = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                      setEditHandle(sanitized);
                    }}
                    placeholder="my_mindful_id"
                    className="w-full pl-8 pr-3.5 py-2.5 text-xs sm:text-sm font-mono rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-white"
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  เพื่อนสามารถพิมพ์ @ID นี้ในช่องค้นหาเพื่อค้นหาและติดตามคุณได้ทันที
                </p>
              </div>

              {/* 5. Bio / Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">
                  ข้อความแนะนำตัว / สเตตัสประจำใจ (Bio)
                </label>
                <textarea
                  rows={2}
                  maxLength={160}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="เช่น กำลังฝึกมองหาความสุขเล็กๆ ในแต่ละวัน..."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-white resize-none"
                />
              </div>

              {/* 6. Private profile toggle: hide from all other users in Social */}
              <div
                onClick={() => setEditIsPrivate(!editIsPrivate)}
                className={`p-3.5 rounded-2xl border-2 flex items-center justify-between gap-3 transition cursor-pointer select-none ${
                  editIsPrivate ? 'bg-gray-800 border-gray-800' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      editIsPrivate ? 'bg-white/10' : 'bg-gray-200'
                    }`}
                  >
                    {editIsPrivate ? (
                      <Lock className="w-5 h-5 text-white" />
                    ) : (
                      <Users className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold ${
                        editIsPrivate ? 'text-white' : 'text-gray-800'
                      }`}
                    >
                      โปรไฟล์เป็นส่วนตัว
                    </p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        editIsPrivate ? 'text-gray-300' : 'text-gray-500'
                      }`}
                    >
                      เปิด: คนอื่นจะไม่เห็นและค้นหาคุณไม่พบใน Social เหมือนบล็อคตัวเองจากคนอื่น — ปิด: แสดงปกติ
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <span
                  className={`relative inline-flex shrink-0 w-11 h-6 rounded-full transition-colors ${
                    editIsPrivate ? 'bg-amber-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                      editIsPrivate ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>บันทึกข้อมูล</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

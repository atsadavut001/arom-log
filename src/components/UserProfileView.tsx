import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
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
import { UserProfile, MoodEntry, SocialPost, MOOD_PRESETS, SCALE_0_10_LEVELS, isLegacyDefaultBio } from '../types.ts';
import { CanvasDrawer } from './CanvasDrawer.tsx';
import { YearlyJournalBook } from './YearlyJournalBook.tsx';
import { PaperShredderModal } from './PaperShredderModal.tsx';
import {
  FileText,
  BookOpen,
  Scissors,
  Heart,
  UserCheck,
  UserPlus,
  Flame,
  Edit3,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Smile,
  ImagePlus,
  Plus,
  Trash2,
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

// Helper: show the uploaded profile photo if present, otherwise fall back to the emoji avatar
const AvatarContent: React.FC<{ photoUrl?: string; emoji: string }> = ({ photoUrl, emoji }) => {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt="รูปโปรไฟล์"
        className="w-full h-full object-cover rounded-full"
      />
    );
  }
  return <span className="select-none filter drop-shadow-xs">{emoji}</span>;
};

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
  // Tabs: 'posts' is primary/default, 'journal' is yearly notebook
  const [activeTab, setActiveTab] = useState<'posts' | 'journal'>('posts');
  const [entries, setEntries] = useState<MoodEntry[]>(ownEntries || []);
  const [loadingEntries, setLoadingEntries] = useState<boolean>(!ownEntries);

  // Social posts state: "สร้างโพส" feed แบบโซเชียล (วาด emoji + ข้อความ) แยกจากบันทึกอารมณ์ประจำวัน
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [postsLoading, setPostsLoading] = useState<boolean>(true);
  const [showComposer, setShowComposer] = useState<boolean>(false);
  const [composerDrawing, setComposerDrawing] = useState<string>('');
  const [composerText, setComposerText] = useState<string>('');
  const [editingDrawing, setEditingDrawing] = useState<boolean>(true);
  const [isPosting, setIsPosting] = useState<boolean>(false);
  const [postError, setPostError] = useState<string>('');
  const [postToShred, setPostToShred] = useState<SocialPost | null>(null);
  const [isDraftShred, setIsDraftShred] = useState<boolean>(false);
  const draftShredCompletedRef = useRef<boolean>(false);

  // Follow state
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);

  // Edit Profile Modal state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editDisplayName, setEditDisplayName] = useState<string>(userProfile.displayName || '');
  const [editAvatarEmoji, setEditAvatarEmoji] = useState<string>(userProfile.avatarEmoji || '😊');
  const [editAvatarBg, setEditAvatarBg] = useState<string>(userProfile.avatarBg || '#FEF3C7');
  const [editPhotoURL, setEditPhotoURL] = useState<string>(userProfile.photoURL || '');
  const [editHandle, setEditHandle] = useState<string>(
    userProfile.handle ? userProfile.handle.replace(/^@/, '') : userProfile.userId.substring(0, 8)
  );
  const [editBio, setEditBio] = useState<string>(
    isLegacyDefaultBio(userProfile.bio) ? '' : (userProfile.bio || '')
  );
  const [editIsPrivate, setEditIsPrivate] = useState<boolean>(userProfile.isPrivate === true);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [copiedHandle, setCopiedHandle] = useState<boolean>(false);
  const [handleError, setHandleError] = useState<string>('');

  const handleOpenEdit = () => {
    setEditDisplayName(userProfile.displayName || '');
    setEditAvatarEmoji(userProfile.avatarEmoji || '😊');
    setEditAvatarBg(userProfile.avatarBg || '#FEF3C7');
    setEditPhotoURL(userProfile.photoURL || '');
    setEditHandle(
      userProfile.handle ? userProfile.handle.replace(/^@/, '') : userProfile.userId.substring(0, 8)
    );
    setEditBio(isLegacyDefaultBio(userProfile.bio) ? '' : (userProfile.bio || ''));
    setEditIsPrivate(userProfile.isPrivate === true);
    setHandleError('');
    setIsEditing(true);
  };

  // Only the profile owner can access 'journal' tab
  useEffect(() => {
    if (!isOwnProfile && activeTab === 'journal') {
      setActiveTab('posts');
    }
  }, [isOwnProfile, activeTab]);

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

  // 1b. Real-time subscription to social posts (feed "โพสต์โซเชียล" ของเจ้าของโปรไฟล์)
  useEffect(() => {
    // Same identity isolation pattern as entries: posts live under /users/{uid}/posts
    const targetUserId = isOwnProfile ? currentUser.uid : userProfile.userId;
    const postsColRef = collection(db, 'users', targetUserId, 'posts');

    const unsubscribe = onSnapshot(
      postsColRef,
      (snapshot) => {
        const list: SocialPost[] = [];
        snapshot.forEach((snap) => {
          list.push(snap.data() as SocialPost);
        });
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setPosts(list);
        setPostsLoading(false);
      },
      (err) => {
        console.warn('Error reading social posts in UserProfileView:', err);
        setPostsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userProfile.userId, isOwnProfile, currentUser.uid]);

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

  // 4b. Upload profile photo: resize + center-crop to 256x256 JPEG data URL
  const MAX_INPUT_PHOTO_BYTES = 8 * 1024 * 1024;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setHandleError('ไฟล์ที่เลือกต้องเป็นรูปภาพเท่านั้น');
      return;
    }
    if (file.size > MAX_INPUT_PHOTO_BYTES) {
      setHandleError('รูปภาพใหญ่เกินไป (เกิน 8MB) กรุณาเลือกไฟล์อื่น');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setHandleError('ไม่สามารถอ่านไฟล์รูปภาพนี้ได้');
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => setHandleError('ไม่สามารถอ่านรูปภาพนี้ได้');
      img.onload = () => {
        // Center-crop to square and resize to 256x256 to keep the Firestore doc small
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setHandleError('เบราว์เซอร์ไม่รองรับการปรับขนาดรูปภาพ');
          return;
        }
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - side) / 2;
        const sy = (img.naturalHeight - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        setEditPhotoURL(canvas.toDataURL('image/jpeg', 0.85));
        setHandleError('');
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
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
        // photoURL เป็น '' = ล้างรูปอัปโหลด (fallback กลับไปใช้ emoji avatar)
        photoURL: editPhotoURL,
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

  const formatTimestampThai = (iso: string) => {
    const datePart = (iso || '').substring(0, 10);
    if (!datePart) return '';
    return formatDateThai(datePart);
  };

  // Social post composer handlers (สร้างโพสแบบโซเชียล: วาด emoji + ข้อความ)
  const openComposer = () => {
    setComposerDrawing('');
    setComposerText('');
    setPostError('');
    setEditingDrawing(true);
    setShowComposer(true);
  };

  const handlePublishPost = async () => {
    if (!composerDrawing.trim() && !composerText.trim()) {
      setPostError('กรุณาวาด emoji หรือพิมพ์ข้อความก่อนโพสต์');
      return;
    }

    setIsPosting(true);
    try {
      const nowIso = new Date().toISOString();
      const postRef = doc(collection(db, 'users', currentUser.uid, 'posts'));
      const newPost: SocialPost = {
        id: postRef.id,
        userId: currentUser.uid,
        drawing: composerDrawing.trim(),
        text: composerText.trim(),
        likes: [],
        likesCount: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await setDoc(postRef, newPost);
      setShowComposer(false);
    } catch (err) {
      console.error('Failed to publish social post:', err);
      setPostError('โพสต์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsPosting(false);
    }
  };

  // Toggle heart on a social post (with optimistic UI update)
  const handleTogglePostLike = async (post: SocialPost) => {
    const isLiked = (post.likes || []).includes(currentUser.uid);
    const postDocRef = doc(db, 'users', userProfile.userId, 'posts', post.id);

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== post.id) return p;
        const curLikes = p.likes || [];
        const nextLikes = isLiked
          ? curLikes.filter((uid) => uid !== currentUser.uid)
          : [...curLikes, currentUser.uid];
        return { ...p, likes: nextLikes, likesCount: nextLikes.length };
      })
    );

    try {
      if (isLiked) {
        await updateDoc(postDocRef, {
          likes: arrayRemove(currentUser.uid),
          likesCount: increment(-1),
        });
      } else {
        await updateDoc(postDocRef, {
          likes: arrayUnion(currentUser.uid),
          likesCount: increment(1),
        });
      }
    } catch (err) {
      console.error('Failed to toggle post heart:', err);
    }
  };

  // Open Paper Shredder modal to delete post with shredding animation
  const handleDeletePost = (post: SocialPost) => {
    draftShredCompletedRef.current = false;
    setIsDraftShred(false);
    setPostToShred(post);
  };

  // Open Paper Shredder modal to shred unposted draft from composer (เอาโพสที่ยังไม่โพสเข้าเครื่องบด)
  const handleShredDraft = (canvasDataUrl?: string) => {
    draftShredCompletedRef.current = false;
    const drawingToUse = canvasDataUrl || composerDrawing || '';
    const textToUse = composerText || (drawingToUse ? '' : 'ร่างโพสต์ที่ยังไม่ได้เผยแพร่');

    const draftPost: SocialPost = {
      id: `draft-${Date.now()}`,
      userId: userProfile.userId,
      userName: userProfile.displayName,
      userAvatar: displayEmoji,
      userAvatarBg: displayBg,
      drawing: drawingToUse,
      text: textToUse,
      createdAt: new Date().toISOString(),
      likes: [],
      likesCount: 0,
    };

    setIsDraftShred(true);
    setPostToShred(draftPost);
    setShowComposer(false);
  };

  // Called when shredder animation completes to permanently delete post or discard draft
  const handleConfirmDeletePost = async () => {
    if (!postToShred) return;

    if (isDraftShred) {
      // Discard unposted draft
      draftShredCompletedRef.current = true;
      setComposerDrawing('');
      setComposerText('');
      setEditingDrawing(true);
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', userProfile.userId, 'posts', postToShred.id));
      setPosts((prev) => prev.filter((p) => p.id !== postToShred.id));
    } catch (err) {
      console.error('Failed to delete social post:', err);
    }
  };

  // Active user's displayed emoji and background
  const displayEmoji = userProfile.avatarEmoji || '😊';
  const displayBg = userProfile.avatarBg || '#FEF3C7';
  const displayPhotoURL = userProfile.photoURL || '';
  const displayHandle = userProfile.handle
    ? `@${userProfile.handle.replace(/^@/, '')}`
    : `@${userProfile.userId.substring(0, 8)}`;

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in pb-12">
      {/* Top Navigation Back bar if viewing another user */}
      {onBack && !isOwnProfile && (
        <div className="print:hidden flex items-center justify-between">
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
      <div className="print:hidden bg-white rounded-3xl p-5 sm:p-7 border border-amber-200/70 shadow-sm relative overflow-hidden">
        {/* Soft background gradient glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 bg-amber-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-orange-100/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6">
          {/* Privacy-Friendly Emoji Avatar Circle */}
          <div className="relative shrink-0">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden flex items-center justify-center text-4xl sm:text-5xl shadow-md border-4 border-white ring-2 ring-amber-200/80 transition-transform hover:scale-105"
              style={{ backgroundColor: displayBg }}
            >
              <AvatarContent photoUrl={displayPhotoURL} emoji={displayEmoji} />
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
                    onClick={handleOpenEdit}
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
            {!isLegacyDefaultBio(userProfile.bio) && userProfile.bio && userProfile.bio.trim() ? (
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-xl">
                {userProfile.bio}
              </p>
            ) : null}

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
                  <strong>{posts.length}</strong> โพสต์
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

      {/* 2. TABS SECTION */}
      <div className="print:hidden flex items-center justify-center sm:justify-start gap-2 border-b border-gray-200/80 pb-2">
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
          <span>โพสต์ ({posts.length})</span>
        </button>

        {/* Tab 2: Yearly Journal (เฉพาะเจ้าของโปรไฟล์เท่านั้นที่เห็น) */}
        {isOwnProfile && (
          <button
            type="button"
            onClick={() => setActiveTab('journal')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === 'journal'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Journal รายปี</span>
          </button>
        )}
      </div>

      {/* 3. CONTENT AREA */}

      {/* TAB A: SOCIAL POSTS STREAM (DEFAULT) — feed โพสต์โซเชียล (วาด emoji + ข้อความ) ไม่ใช่บันทึกอารมณ์ประจำวัน */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {/* Composer launcher: สร้างโพส (own profile only) */}
          {isOwnProfile && (
            <div className="bg-white rounded-3xl border border-amber-200/70 shadow-sm p-4 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-xl shadow-xs border border-white shrink-0"
                style={{ backgroundColor: displayBg }}
              >
                <AvatarContent photoUrl={displayPhotoURL} emoji={displayEmoji} />
              </div>
              <button
                type="button"
                onClick={openComposer}
                className="flex-1 text-left px-4 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900/70 text-xs sm:text-sm font-semibold border border-amber-200 transition cursor-pointer"
              >
                สร้างโพสใหม่ — วาด emoji แล้วเติมข้อความ...
              </button>
              <button
                type="button"
                onClick={openComposer}
                className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-200 transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">สร้างโพส</span>
              </button>
            </div>
          )}

          {postsLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-gray-400 gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
              <span className="text-xs">กำลังโหลดโพสต์...</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-gray-200/80 p-6 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center text-2xl">
                ✍️
              </div>
              <h4 className="text-base font-bold text-gray-800">ยังไม่มีโพสต์โซเชียล</h4>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                {isOwnProfile
                  ? 'กดปุ่ม "สร้างโพส" เพื่อวาด emoji แสดงความรู้สึกและเขียนข้อความ แล้วกดโพสเหมือนโซเชียลยอดฮิต!'
                  : 'ผู้ใช้คนนี้ยังไม่ได้สร้างโพสต์ใด'}
              </p>
              {isOwnProfile && (
                <button
                  type="button"
                  onClick={openComposer}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-200 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  สร้างโพสเป็นโพสต์แรก
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => {
                const isLikedByMe = (post.likes || []).includes(currentUser.uid);
                const likesCount = post.likesCount || (post.likes || []).length || 0;

                return (
                  <div
                    key={post.id}
                    className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-2xs hover:shadow-sm transition space-y-4"
                  >
                    {/* Post Card Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-xl shadow-xs border border-white shrink-0"
                          style={{ backgroundColor: displayBg }}
                        >
                          <AvatarContent photoUrl={displayPhotoURL} emoji={displayEmoji} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-black text-gray-900 truncate">
                              {userProfile.displayName}
                            </span>
                            <span className="text-[11px] text-gray-400 font-mono truncate hidden sm:inline">
                              {displayHandle}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-400 block">
                            {formatTimestampThai(post.createdAt)}
                          </span>
                        </div>
                      </div>

                      {isOwnProfile && (
                        <button
                          type="button"
                          onClick={() => handleDeletePost(post)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                          title="ลบโพสต์นี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Drawn emoji image (จาก Canvas) */}
                    {post.drawing && (
                      <div className="rounded-2xl overflow-hidden border border-gray-200 bg-amber-50/40 flex justify-center">
                        <img
                          src={post.drawing}
                          alt="post emoji"
                          className="w-auto max-h-72 object-contain"
                        />
                      </div>
                    )}

                    {/* Post text */}
                    {post.text && (
                      <p className="text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {post.text}
                      </p>
                    )}

                    {/* Footer: heart like button */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleTogglePostLike(post)}
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB B: YEARLY JOURNAL BOOK (Journal รายปี — เฉพาะเจ้าของโปรไฟล์เท่านั้น) */}
      {isOwnProfile && activeTab === 'journal' && (
        <YearlyJournalBook
          entries={entries}
          userProfile={userProfile}
          isOwnProfile={isOwnProfile}
          onSelectDateForEdit={onSelectDateForEdit}
        />
      )}

      {/* 3b. CREATE SOCIAL POST COMPOSER (สร้างโพส: วาด emoji + ข้อความ → กดโพส) */}
      {showComposer && (
        <div
          onClick={() => !isPosting && setShowComposer(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-amber-200 my-auto p-5 sm:p-7 space-y-5 max-h-[92vh] overflow-y-auto"
          >
            {/* Composer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg">
                  ✍️
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-gray-900 leading-tight">
                    สร้างโพสใหม่
                  </h3>
                  <p className="text-[11px] text-gray-500">วาด emoji และใส่ข้อความ เหมือนการโพสในโซเชียล</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleShredDraft()}
                  className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs hover:shadow"
                  title="เอาโพสที่ยังไม่โพสเข้าเครื่องบด"
                >
                  <Scissors className="w-3.5 h-3.5 text-rose-600" />
                  <span>บดทิ้ง</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowComposer(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition cursor-pointer"
                  aria-label="ปิดหน้าต่าง"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Error banner */}
            {postError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{postError}</span>
              </div>
            )}

            {/* Step 1: Draw emoji with canvas */}
            {editingDrawing ? (
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  วาด emoji ประจำโพส
                </span>
                <CanvasDrawer
                  initialDrawing={composerDrawing}
                  onSaveDrawing={(dataUrl) => {
                    setComposerDrawing(dataUrl);
                    setEditingDrawing(false);
                  }}
                  onCancel={() => setShowComposer(false)}
                  onShredDraft={(canvasDataUrl) => handleShredDraft(canvasDataUrl)}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Step 2: Preview drawn emoji */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    emoji ของโพสนี้
                  </span>
                  <div className="flex flex-col items-center gap-2 p-3 bg-amber-50/60 border border-amber-200/70 rounded-2xl">
                    <div className="rounded-2xl overflow-hidden border border-amber-200 bg-white">
                      <img src={composerDrawing} alt="emoji ที่วาด" className="max-h-48 object-contain" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingDrawing(true)}
                      className="text-[11px] font-bold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      แก้ไขรูปที่วาด
                    </button>
                  </div>
                </div>

                {/* Post message */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 block">ข้อความในโพส</label>
                  <textarea
                    rows={4}
                    maxLength={500}
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    placeholder="เขียนข้อความส่งพลังใจ เช่น วันนี้มีความสุขเพราะ..."
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-white resize-none"
                  />
                  <p className="text-[11px] text-gray-400 text-right">{composerText.length}/500</p>
                </div>

                {/* Post action buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowComposer(false)}
                    disabled={isPosting}
                    className="py-2.5 px-3.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShredDraft()}
                    disabled={isPosting}
                    className="py-2.5 px-3.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs"
                    title="เอาโพสที่ยังไม่โพสเข้าเครื่องบด"
                  >
                    <Scissors className="w-3.5 h-3.5 text-rose-600" />
                    <span>บดทิ้ง</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePublishPost}
                    disabled={isPosting}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isPosting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังโพส...</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>โพส</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
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
                  className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-4xl shadow-md border-4 border-white ring-2 ring-amber-300 transition-transform"
                  style={{ backgroundColor: editAvatarBg }}
                >
                  <AvatarContent photoUrl={editPhotoURL} emoji={editAvatarEmoji} />
                </div>
                <span className="text-[11px] text-gray-500">
                  @{editHandle ? editHandle.replace(/^@/, '') : 'id'}
                </span>
              </div>

              {/* 0. Uploaded profile photo (รูปอัปโหลดจะแสดงแทน emoji ถ้ามี) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <ImagePlus className="w-4 h-4 text-amber-600" />
                  <span>อัปโหลดรูปโปรไฟล์ (ถ้าไม่อัปโหลดจะใช้ emoji)</span>
                </label>
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-white border border-gray-200 shrink-0">
                    {editPhotoURL ? (
                      <img
                        src={editPhotoURL}
                        alt="รูปโปรไฟล์ที่อัปโหลด"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl opacity-40">🖼️</span>
                    )}
                  </div>
                  <div className="flex-1 flex flex-wrap items-center gap-2 min-w-0">
                    <label className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer transition flex items-center gap-1.5 shadow-xs">
                      <ImagePlus className="w-3.5 h-3.5" />
                      <span>เลือกรูปจากอุปกรณ์</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                    {editPhotoURL && (
                      <button
                        type="button"
                        onClick={() => setEditPhotoURL('')}
                        className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบรูป (ใช้ emoji แทน)</span>
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">
                  รูปจะถูกตัดเป็นสี่เหลี่ยมจตุรัสกึ่งกลางและย่อเหลือ 256×256 อัตโนมัติเพื่อให้โหลดเร็วและประหยัดพื้นที่
                </p>
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

      {/* 3c. PAPER SHREDDER MODAL (แอนิเมชันเอาโพสต์เข้าเครื่องบดกระดาษ) */}
      {postToShred && (
        <PaperShredderModal
          post={postToShred}
          authorName={userProfile.displayName || 'ผู้ใช้งาน'}
          authorEmoji={displayEmoji}
          authorBg={displayBg}
          authorPhotoURL={displayPhotoURL}
          isDraft={isDraftShred}
          onConfirmDelete={handleConfirmDeletePost}
          onClose={() => {
            if (isDraftShred && !draftShredCompletedRef.current) {
              // If user cancelled shredding the draft, reopen composer with draft preserved
              setShowComposer(true);
            }
            setIsDraftShred(false);
            setPostToShred(null);
          }}
        />
      )}
    </div>
  );
};

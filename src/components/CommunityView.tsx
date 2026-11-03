import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';
import { db } from '../firebase.ts';
import { UserProfile, SocialPost, isLegacyDefaultBio, getAvatarEmojiImage } from '../types.ts';
import { UserProfileView } from './UserProfileView.tsx';
import {
  Users,
  UserPlus,
  UserCheck,
  Heart,
  Search,
  ChevronLeft,
  Flame,
  AtSign,
  Loader2,
  User as UserIcon
} from 'lucide-react';

interface CommunityViewProps {
  currentUser: User;
  currentUserProfile?: UserProfile | null;
  onSelectOwnProfile?: () => void;
  onSelectDateForEdit?: (dateStr: string) => void;
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
}

export const CommunityView: React.FC<CommunityViewProps> = ({
  currentUser,
  currentUserProfile,
  onSelectOwnProfile,
  onSelectDateForEdit,
  selectedMonth,
  onMonthChange,
}) => {
  const navigate = useNavigate();
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'posts' | 'following'>('posts');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // โปรไฟล์ของคนที่เราติดตามแต่ไม่เป็นสาธารณะ (ไม่ติดใน usersList)
  const [followedProfiles, setFollowedProfiles] = useState<UserProfile[]>([]);
  // โพสต์ที่เห็นได้ = โปรไฟล์สาธารณะทั้งหมด + คนที่เราติดตาม (แม้จะไม่เป็นสาธารณะ)
  const [communityPosts, setCommunityPosts] = useState<(SocialPost & { author: UserProfile })[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // 1. Fetch community users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      setFetchError(null);
      const usersCol = collection(db, 'users');
      const all: UserProfile[] = [];

      try {
        try {
          // Firestore-level privacy: query public profiles (isPrivate == false).
          // Matches Firestore security rule: allow list: if resource.data.isPrivate == false
          const usersSnapshot = await getDocs(
            query(usersCol, where('isPrivate', '==', false))
          );
          usersSnapshot.forEach((docSnap) => {
            all.push(docSnap.data() as UserProfile);
          });
        } catch {
          // Fallback: if rules are unrestricted in development, fetch all and filter on client
          const usersSnapshot = await getDocs(usersCol);
          usersSnapshot.forEach((docSnap) => {
            all.push(docSnap.data() as UserProfile);
          });
        }

        // Private profiles are hidden entirely: invisible and unsearchable (self-blocked from others)
        setUsersList(
          all.filter((u) => u.userId && u.userId !== currentUser.uid && u.isPrivate !== true)
        );
      } catch (err: any) {
        console.warn('Community users fetch warning:', err);
        setFetchError(
          err?.code === 'permission-denied'
            ? 'ไม่มีสิทธิ์อ่านรายชื่อเพื่อน — กรุณา Publish กฎ firestore.rules ที่ Firestore Console ก่อน'
            : 'โหลดรายชื่อเพื่อนไม่สำเร็จ กรุณาลองใหม่ภายหลัง'
        );
        setUsersList([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [currentUser.uid]);

  // 1a. Load profiles of followed users that are not public (so their posts can be shown)
  useEffect(() => {
    const missingIds = followingIds.filter(
      (id) => id !== currentUser.uid && !usersList.some((u) => u.userId === id)
    );

    if (missingIds.length === 0) {
      setFollowedProfiles((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    let cancelled = false;
    const fetchFollowedProfiles = async () => {
      const fetched: UserProfile[] = [];
      await Promise.all(
        missingIds.map(async (id) => {
          try {
            const snap = await getDoc(doc(db, 'users', id));
            if (snap.exists()) fetched.push(snap.data() as UserProfile);
          } catch (err) {
            console.warn('Could not read followed profile', id, err);
          }
        })
      );
      if (!cancelled) setFollowedProfiles(fetched);
    };

    fetchFollowedProfiles();
    return () => {
      cancelled = true;
    };
  }, [followingIds, usersList, currentUser.uid]);

  // Author pool for the feed: ทุกคนที่เป็นสาธารณะ + คนที่เราติดตาม (dedupe by userId)
  const feedAuthors = useMemo(() => {
    const map = new Map<string, UserProfile>();
    [...usersList, ...followedProfiles].forEach((author) => {
      if (author.userId && author.userId !== currentUser.uid) {
        map.set(author.userId, author);
      }
    });
    return Array.from(map.values());
  }, [usersList, followedProfiles, currentUser.uid]);

  // 1b. Fetch posts of every visible author (/users/{uid}/posts) for the community feed
  useEffect(() => {
    if (loadingUsers) return;

    let cancelled = false;
    const fetchAllPosts = async () => {
      setLoadingPosts(true);
      const collected: (SocialPost & { author: UserProfile })[] = [];

      await Promise.all(
        feedAuthors.map(async (author) => {
          try {
            const snapshot = await getDocs(collection(db, 'users', author.userId, 'posts'));
            snapshot.forEach((docSnap) => {
              collected.push({ ...(docSnap.data() as SocialPost), author });
            });
          } catch (err) {
            console.warn('Could not read posts of', author.userId, err);
          }
        })
      );

      if (cancelled) return;
      collected.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setCommunityPosts(collected);
      setLoadingPosts(false);
    };

    fetchAllPosts();
    return () => {
      cancelled = true;
    };
  }, [feedAuthors, loadingUsers]);

  // 2. Fetch current user's followed list
  useEffect(() => {
    const followingColRef = collection(db, 'users', currentUser.uid, 'following');
    const unsubscribe = onSnapshot(followingColRef, (snapshot) => {
      const ids: string[] = [];
      snapshot.forEach((docSnap) => {
        ids.push(docSnap.id);
      });
      setFollowingIds(ids);
    });

    return () => unsubscribe();
  }, [currentUser.uid]);

  // 3. Follow / Unfollow Handler
  const handleToggleFollow = async (targetUser: UserProfile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isCurrentlyFollowing = followingIds.includes(targetUser.userId);
    const followDocRef = doc(db, 'users', currentUser.uid, 'following', targetUser.userId);

    try {
      if (isCurrentlyFollowing) {
        await deleteDoc(followDocRef);
        setFollowingIds((prev) => prev.filter((id) => id !== targetUser.userId));
      } else {
        await setDoc(followDocRef, {
          followerId: currentUser.uid,
          followedUserId: targetUser.userId,
          createdAt: new Date().toISOString(),
        });
        setFollowingIds((prev) => [...prev, targetUser.userId]);
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    }
  };

  // Toggle heart on a community post (optimistic update, then persist)
  const handleTogglePostLike = async (post: SocialPost & { author: UserProfile }) => {
    const isLiked = (post.likes || []).includes(currentUser.uid);
    const postDocRef = doc(db, 'users', post.author.userId, 'posts', post.id);

    setCommunityPosts((prev) =>
      prev.map((p) => {
        if (p.id !== post.id || p.author.userId !== post.author.userId) return p;
        const currentLikes = p.likes || [];
        const nextLikes = isLiked
          ? currentLikes.filter((uid) => uid !== currentUser.uid)
          : [...currentLikes, currentUser.uid];
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

  // Filter public posts by search query (author name, @handle or post text)
  const filteredPosts = communityPosts.filter((post) => {
    const q = searchQuery.toLowerCase().trim().replace(/^@/, '');
    if (!q) return true;
    const author = post.author;
    const authorHandle = (author.handle || '').toLowerCase().replace(/^@/, '');
    return (
      (author.displayName || '').toLowerCase().includes(q) ||
      authorHandle.includes(q) ||
      (post.text || '').toLowerCase().includes(q)
    );
  });

  const formatTimestampThai = (iso: string) => {
    const datePart = (iso || '').substring(0, 10);
    if (!datePart) return '';
    const [y, m, d] = datePart.split('-').map(Number);
    const thaiMonthsShort = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    return `${d} ${thaiMonthsShort[m - 1]} ${y + 543}`;
  };

  // Filter users list by search query (both name and @ID handle) and tabs
  const filteredUsers = usersList.filter((u) => {
    const q = searchQuery.toLowerCase().trim().replace(/^@/, '');
    const userHandle = (u.handle || '').toLowerCase().replace(/^@/, '');
    const userName = u.displayName.toLowerCase();
    const userBio = (u.bio || '').toLowerCase();

    const matchesSearch = !q || userName.includes(q) || userHandle.includes(q) || userBio.includes(q);

    if (activeTab === 'following') {
      return matchesSearch && followingIds.includes(u.userId);
    }
    return matchesSearch;
  });

  // If a user profile is selected, show their full Social Media Profile View
  if (selectedUser) {
    return (
      <UserProfileView
        userProfile={selectedUser}
        currentUser={currentUser}
        isOwnProfile={selectedUser.userId === currentUser.uid}
        selectedMonth={selectedMonth}
        onMonthChange={onMonthChange}
        onBack={() => setSelectedUser(null)}
        onSelectDateForEdit={onSelectDateForEdit}
      />
    );
  }

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100 max-w-4xl mx-auto space-y-6 animate-in fade-in">
      {/* Top Banner Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mt-2">
            พื้นที่ส่งพลังใจ & ติดตามเพื่อน
          </h2>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            ค้นหาเพื่อนผ่าน @ID เพื่อดูโพสต์ ปฏิทินอารมณ์ และกดหัวใจให้กำลังใจ
          </p>
        </div>

        {onSelectOwnProfile && currentUserProfile && (
          <button
            type="button"
            onClick={onSelectOwnProfile}
            className="self-start sm:self-auto px-4 py-2 bg-green-50 hover:bg-green-100 text-green-900 border border-green-200 text-xs font-bold rounded-2xl transition flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <div
              className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-sm shadow-xs border border-white"
              style={{ backgroundColor: currentUserProfile.avatarBg || '#FEF3C7' }}
            >
              {currentUserProfile.photoURL ? (
                <img
                  src={currentUserProfile.photoURL}
                  alt="รูปโปรไฟล์ของฉัน"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : getAvatarEmojiImage(currentUserProfile.avatarEmoji) ? (
                <img
                  src={getAvatarEmojiImage(currentUserProfile.avatarEmoji)!}
                  alt="รูปโปรไฟล์ของฉัน"
                  className="w-full h-full object-contain p-0.5 select-none"
                  draggable={false}
                />
              ) : (
                <span>{currentUserProfile.avatarEmoji || '😊'}</span>
              )}
            </div>
            <span>โปรไฟล์ของฉัน</span>
          </button>
        )}
      </div>

      {/* Search Bar & Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Filter Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('posts')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'posts'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            โพสต์ ({communityPosts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('following')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'following'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            กำลังติดตาม ({followingIds.length})
          </button>
        </div>

        {/* Search Input supporting @ID handle and Display Name */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeTab === 'posts' ? 'ค้นหาโพสต์ ชื่อ หรือ @ID...' : 'ค้นหาชื่อ หรือ @ID เพื่อเพิ่มเพื่อน...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2.5 rounded-2xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-green-500/50 bg-gray-50/50"
          />
        </div>
      </div>

      {/* Fetch Error Banner */}
      {fetchError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold flex items-center gap-2.5">
          <span>⚠️</span>
          <span>{fetchError}</span>
        </div>
      )}

      {/* TAB 1: โพสต์ทั้งหมดของผู้ใช้ที่เป็นสาธารณะ */}
      {activeTab === 'posts' ? (
        loadingUsers || loadingPosts ? (
          <div className="py-16 flex flex-col items-center justify-center text-gray-400 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            <span className="text-xs">กำลังโหลดโพสต์...</span>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-16 bg-gray-50/80 rounded-3xl border border-gray-200 text-xs text-gray-500 space-y-2">
            <Heart className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="font-bold text-sm text-gray-700">
              {searchQuery
                ? `ไม่พบโพสต์ที่ตรงกับ "${searchQuery}"`
                : 'ยังไม่มีโพสต์จากผู้ใช้ที่เปิดโปรไฟล์สาธารณะ'}
            </p>
            <p className="text-[11px] max-w-xs mx-auto">
              {searchQuery
                ? 'ลองค้นหาด้วยชื่อ @ID หรือข้อความในโพสต์อื่น'
                : 'เมื่อเพื่อนที่เปิดโปรไฟล์สาธารณะโพสต์ จะแสดงโพสต์ทั้งหมดที่นี่'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {/* Web: 3 คอลัมน์ (แท็บเล็ต 2 / มือถือ 1) • รูปโพสต์เป็น 1:1 */}
            {filteredPosts.map((post) => {
              const author = post.author;
              const authorHandle = author.handle
                ? `@${author.handle.replace(/^@/, '')}`
                : `@${author.userId.substring(0, 8)}`;
              const likesCount = post.likesCount || (post.likes || []).length || 0;
              const isLikedByMe = (post.likes || []).includes(currentUser.uid);

              return (
                <article
                  key={`${author.userId}-${post.id}`}
                  className="space-y-3 flex flex-col pb-4 border-b border-green-100 last:border-b-0 last:pb-0"
                >
                  {/* Post author — คลิกที่ชื่อหรือรูปเพื่อไปหน้าโปรไฟล์ */}
                  <button
                    type="button"
                    onClick={() => navigate(`/profile/${author.userId}`)}
                    className="flex items-center gap-3 w-full text-left cursor-pointer group"
                    title={`ดูโปรไฟล์ของ ${author.displayName}`}
                  >
                    <div
                      className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-xl shadow-xs border border-white ring-1 ring-green-200 shrink-0"
                      style={{ backgroundColor: author.avatarBg || '#FEF3C7' }}
                    >
                      {author.photoURL ? (
                        <img
                          src={author.photoURL}
                          alt={`รูปโปรไฟล์ของ ${author.displayName}`}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : getAvatarEmojiImage(author.avatarEmoji) ? (
                        <img
                          src={getAvatarEmojiImage(author.avatarEmoji)!}
                          alt={`รูปโปรไฟล์ของ ${author.displayName}`}
                          className="w-full h-full object-contain p-1 select-none"
                          draggable={false}
                        />
                      ) : (
                        <span className="select-none">{author.avatarEmoji || '😊'}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-extrabold text-gray-900 text-xs sm:text-sm truncate group-hover:text-green-800 group-hover:underline">
                          {author.displayName}
                        </h4>
                        <span className="text-[11px] text-green-900/70 font-mono font-medium truncate">
                          {authorHandle}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400 block">
                        {formatTimestampThai(post.createdAt)}
                      </span>
                    </div>
                  </button>

                  {/* Drawn emoji image — สี่เหลี่ยมจัตุรัส 1:1 */}
                  {post.drawing && (
                    <div className="rounded-2xl overflow-hidden aspect-square w-full">
                      <img
                        src={post.drawing}
                        alt="ภาพวาดอารมณ์ในโพสต์"
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Post text */}
                  {post.text && (
                    <p className="text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {post.text}
                    </p>
                  )}

                  {/* Likes — กดหัวใจได้เลยจากฟีด ไม่ต้องเข้าหน้าโปรไฟล์ */}
                  <button
                    type="button"
                    onClick={() => handleTogglePostLike(post)}
                    className={`mt-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition cursor-pointer active:scale-95 self-start border ${
                      isLikedByMe
                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                        : 'bg-gray-50 text-gray-600 hover:bg-rose-50/60 hover:text-rose-600 border-gray-200'
                    }`}
                    title="กดหัวใจให้กำลังใจ"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        isLikedByMe ? 'fill-rose-500 text-rose-500' : 'text-gray-400'
                      }`}
                    />
                    <span>{likesCount} ใจ</span>
                  </button>
                </article>
              );
            })}
          </div>
        )
      ) : loadingUsers ? (
        <div className="py-16 flex flex-col items-center justify-center text-gray-400 gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          <span className="text-xs">กำลังค้นหาเพื่อนในระบบ...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-16 bg-gray-50/80 rounded-3xl border border-gray-200 text-xs text-gray-500 space-y-2">
          <Users className="w-10 h-10 text-gray-300 mx-auto" />
          <p className="font-bold text-sm text-gray-700">
            {searchQuery
              ? `ไม่พบเพื่อนที่ตรงกับ "${searchQuery}"`
              : activeTab === 'following'
              ? 'คุณยังไม่ได้ติดตามเพื่อนคนใด'
              : 'ยังไม่พบเพื่อนในระบบ'}
          </p>
          <p className="text-[11px] max-w-xs mx-auto">
            {searchQuery
              ? 'ลองค้นหาด้วย @ID อื่น หรือสอบถาม @ID จากเพื่อนของคุณ'
              : 'เมื่อมีเพื่อนสมัครและเริ่มบันทึกอารมณ์ จะแสดงรายการที่นี่'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {filteredUsers.map((user) => {
            const isFollowing = followingIds.includes(user.userId);
            const userEmoji = user.avatarEmoji || '😊';
            const userBg = user.avatarBg || '#FEF3C7';
            const userHandle = user.handle
              ? `@${user.handle.replace(/^@/, '')}`
              : `@${user.userId.substring(0, 8)}`;

            return (
              <div
                key={user.userId}
                onClick={() => navigate(`/profile/${user.userId}`)}
                className="p-4 rounded-3xl border border-gray-200 bg-white hover:border-green-300 hover:shadow-md transition-all flex items-center justify-between gap-3 shadow-2xs group cursor-pointer"
              >
                {/* User Info with Anonymous Emoji Avatar */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-2xl shadow-xs border-2 border-white ring-1 ring-green-200 shrink-0 group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: userBg }}
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={`รูปโปรไฟล์ของ ${user.displayName}`}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : getAvatarEmojiImage(userEmoji) ? (
                      <img
                        src={getAvatarEmojiImage(userEmoji)!}
                        alt={`รูปโปรไฟล์ของ ${user.displayName}`}
                        className="w-full h-full object-contain p-1.5 select-none"
                        draggable={false}
                      />
                    ) : (
                      <span className="filter drop-shadow-2xs select-none">{userEmoji}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-gray-900 text-xs sm:text-sm truncate group-hover:text-green-800">
                        {user.displayName}
                      </h4>
                      {user.streak !== undefined && user.streak > 0 && (
                        <span className="flex items-center text-[10px] text-teal-600 font-bold shrink-0">
                          🔥{user.streak}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-green-900/70 font-mono font-medium block">
                      {userHandle}
                    </span>
                    {!isLegacyDefaultBio(user.bio) && user.bio && user.bio.trim() ? (
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {user.bio}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleToggleFollow(user, e)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      isFollowing
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-green-100 hover:bg-green-200 text-green-900'
                    }`}
                    title={isFollowing ? 'เลิกติดตาม' : 'ติดตาม'}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden xs:inline">ติดตามแล้ว</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">ติดตาม</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

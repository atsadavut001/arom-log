import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { db } from '../firebase.ts';
import { UserProfile, isLegacyDefaultBio, getAvatarEmojiImage } from '../types.ts';
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
  const [activeTab, setActiveTab] = useState<'all' | 'following'>('all');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

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
            className="self-start sm:self-auto px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold rounded-2xl transition flex items-center gap-2 cursor-pointer shadow-2xs"
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
            onClick={() => setActiveTab('all')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            เพื่อนทั้งหมด ({usersList.length})
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
            placeholder="ค้นหาชื่อ หรือ @ID เพื่อเพิ่มเพื่อน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2.5 rounded-2xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 bg-gray-50/50"
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

      {/* Users Grid */}
      {loadingUsers ? (
        <div className="py-16 flex flex-col items-center justify-center text-gray-400 gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
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
                className="p-4 rounded-3xl border border-gray-200 bg-white hover:border-amber-300 hover:shadow-md transition-all flex items-center justify-between gap-3 shadow-2xs group cursor-pointer"
              >
                {/* User Info with Anonymous Emoji Avatar */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-2xl shadow-xs border-2 border-white ring-1 ring-amber-200 shrink-0 group-hover:scale-105 transition-transform"
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
                      <h4 className="font-extrabold text-gray-900 text-xs sm:text-sm truncate group-hover:text-amber-800">
                        {user.displayName}
                      </h4>
                      {user.streak !== undefined && user.streak > 0 && (
                        <span className="flex items-center text-[10px] text-orange-600 font-bold shrink-0">
                          🔥{user.streak}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-amber-900/70 font-mono font-medium block">
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
                        : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
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

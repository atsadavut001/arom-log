/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { auth, db } from './firebase.ts';
import { MoodEntry, UserProfile } from './types.ts';
import { Navbar, TabType } from './components/Navbar.tsx';
import { DailyEntryForm } from './components/DailyEntryForm.tsx';
import { MoodJar } from './components/MoodJar.tsx';
import { CalendarView } from './components/CalendarView.tsx';
import { AnalyticsView } from './components/AnalyticsView.tsx';
import { CommunityView } from './components/CommunityView.tsx';
import { UserProfileView } from './components/UserProfileView.tsx';
import { MiniGame } from './components/MiniGame.tsx';
import { StreakRewardsModal } from './components/StreakRewardsModal.tsx';
import { InstallPwaModal } from './components/InstallPwaModal.tsx';
import { AuthScreen } from './components/AuthScreen.tsx';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showGameModal, setShowGameModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any | null>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);

  // Default to 'calendar', but initial snapshot will determine if today has an entry
  const [currentTab, setCurrentTab] = useState<TabType>('calendar');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  const hasInitialRoutedRef = useRef<boolean>(false);

  // 1. Session Management: Listen to Auth State and UserProfile
  useEffect(() => {
    let unsubProfileDoc: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (unsubProfileDoc) {
        unsubProfileDoc();
        unsubProfileDoc = null;
      }

      if (!user) {
        hasInitialRoutedRef.current = false;
        setCurrentUserProfile(null);
        setUnlockedBadges([]);
      }

      if (user) {
        // Sync or initialize UserProfile document under /users/{userId}
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const userSnap = await getDoc(userDocRef);
          const nowIso = new Date().toISOString();
          const cleanName = user.displayName || 'ผู้ใช้งาน';
          const defaultHandle = (user.displayName || 'user')
            .toLowerCase()
            .replace(/[^a-zA-Z0-9_]/g, '')
            .slice(0, 15) || `user_${user.uid.slice(0, 6)}`;

          if (!userSnap.exists()) {
            const initialProfile: UserProfile = {
              userId: user.uid,
              displayName: cleanName,
              email: user.email || '',
              avatarEmoji: '😊',
              avatarBg: '#FEF3C7',
              handle: defaultHandle,
              bio: 'กำลังดูแลสุขภาพใจและบันทึกอารมณ์ในทุกๆ วัน 🌱',
              isPrivate: false,
              streak: 0,
              longestStreak: 0,
              badges: [],
              createdAt: nowIso,
              updatedAt: nowIso,
            };
            await setDoc(userDocRef, initialProfile);
            setCurrentUserProfile(initialProfile);
          } else {
            const existingData = userSnap.data() as UserProfile;
            if (existingData.badges) {
              setUnlockedBadges(existingData.badges);
            }
            // Ensure avatar and handle exist if legacy user
            // (also backfill isPrivate so Social queries can find this profile)
            const patch: Partial<UserProfile> = {
              displayName: existingData.displayName || cleanName,
              email: user.email || existingData.email || '',
              avatarEmoji: existingData.avatarEmoji || '😊',
              avatarBg: existingData.avatarBg || '#FEF3C7',
              handle: existingData.handle || defaultHandle,
              isPrivate: existingData.isPrivate === true,
              updatedAt: nowIso,
            };
            await setDoc(userDocRef, patch, { merge: true });
            setCurrentUserProfile({ ...existingData, ...patch });
          }

          // Live listener to user profile
          unsubProfileDoc = onSnapshot(userDocRef, (snap) => {
            if (snap.exists()) {
              const liveData = snap.data() as UserProfile;
              setCurrentUserProfile(liveData);
              if (liveData.badges) {
                setUnlockedBadges(liveData.badges);
              }
            }
          });
        } catch (err) {
          console.warn('User profile sync notice:', err);
        }
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfileDoc) unsubProfileDoc();
    };
  }, []);

  // 2. Real-time Subscription to user's daily mood entries
  useEffect(() => {
    if (!currentUser) {
      setEntries([]);
      return;
    }

    setEntriesLoading(true);
    const entriesColRef = collection(db, 'users', currentUser.uid, 'entries');

    const unsubscribe = onSnapshot(
      entriesColRef,
      (snapshot) => {
        const fetchedEntries: MoodEntry[] = [];
        snapshot.forEach((docSnap) => {
          fetchedEntries.push(docSnap.data() as MoodEntry);
        });
        // Sort descending by date
        fetchedEntries.sort((a, b) => b.date.localeCompare(a.date));
        setEntries(fetchedEntries);
        setEntriesLoading(false);

        // Routing rule requested:
        // Default to Calendar View; if today does not have a mood entry yet, route to Daily Entry
        if (!hasInitialRoutedRef.current) {
          const currentDayStr = new Date().toISOString().split('T')[0];
          const hasTodayEntry = fetchedEntries.some((e) => e.date === currentDayStr);

          if (!hasTodayEntry) {
            setCurrentTab('entry');
          } else {
            setCurrentTab('calendar');
          }
          hasInitialRoutedRef.current = true;
        }
      },
      (error) => {
        console.error('Firestore entries listener error:', error);
        setEntriesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // 3. Duolingo-style Streak calculation
  const calculateStreakStats = (allEntries: MoodEntry[]) => {
    if (allEntries.length === 0) return { current: 0, longest: 0 };

    const uniqueDates = Array.from(new Set(allEntries.map((e) => e.date))).sort();

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);

    const todayIso = todayDate.toISOString().split('T')[0];
    const yesterdayIso = yesterdayDate.toISOString().split('T')[0];

    const hasToday = uniqueDates.includes(todayIso);
    const hasYesterday = uniqueDates.includes(yesterdayIso);

    let currentStreak = 0;
    if (hasToday || hasYesterday) {
      let checkDate = hasToday ? new Date(todayDate) : new Date(yesterdayDate);
      while (true) {
        const checkIso = checkDate.toISOString().split('T')[0];
        if (uniqueDates.includes(checkIso)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Calculate longest streak ever achieved
    let longestStreak = 0;
    let tempStreak = 0;
    let prevTime: number | null = null;

    for (const dateStr of uniqueDates) {
      const currTime = new Date(`${dateStr}T00:00:00`).getTime();
      if (prevTime === null) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((currTime - prevTime) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      prevTime = currTime;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    }

    return {
      current: currentStreak,
      longest: Math.max(longestStreak, currentStreak),
    };
  };

  const streakStats = calculateStreakStats(entries);

  // Sync calculated streak and unlock badges in Firestore
  useEffect(() => {
    if (!currentUser || entries.length === 0) return;

    const syncStreakToFirestore = async () => {
      const userDocRef = doc(db, 'users', currentUser.uid);
      try {
        const newlyUnlocked: string[] = [...unlockedBadges];
        let hasNewBadge = false;

        if (streakStats.current >= 1 && !newlyUnlocked.includes('streak_1')) {
          newlyUnlocked.push('streak_1');
          hasNewBadge = true;
        }
        if (streakStats.current >= 3 && !newlyUnlocked.includes('streak_3')) {
          newlyUnlocked.push('streak_3');
          hasNewBadge = true;
        }
        if (streakStats.current >= 7 && !newlyUnlocked.includes('streak_7')) {
          newlyUnlocked.push('streak_7');
          hasNewBadge = true;
        }
        if (streakStats.current >= 14 && !newlyUnlocked.includes('streak_14')) {
          newlyUnlocked.push('streak_14');
          hasNewBadge = true;
        }
        if (streakStats.current >= 30 && !newlyUnlocked.includes('streak_30')) {
          newlyUnlocked.push('streak_30');
          hasNewBadge = true;
        }
        if (streakStats.current >= 100 && !newlyUnlocked.includes('streak_100')) {
          newlyUnlocked.push('streak_100');
          hasNewBadge = true;
        }

        const lastDate = entries[0]?.date || '';
        await setDoc(
          userDocRef,
          {
            streak: streakStats.current,
            longestStreak: streakStats.longest,
            lastActiveDate: lastDate,
            badges: newlyUnlocked,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        if (hasNewBadge) {
          setUnlockedBadges(newlyUnlocked);
        }
      } catch (err) {
        console.warn('Sync streak warning:', err);
      }
    };

    syncStreakToFirestore();
  }, [currentUser, entries, streakStats.current]);

  // Handle entry saved
  const handleEntrySaved = () => {
    setCurrentTab('calendar');
  };

  // Handle selecting a date to edit or view
  const handleSelectDateForEdit = (dateStr: string) => {
    setSelectedDate(dateStr);
    setCurrentTab('entry');
  };

  // Handle game completion and badge award
  const handleGameComplete = async (badgeId?: string) => {
    if (!currentUser) return;
    const badgeToUnlock = badgeId || 'mindful_peace';
    if (!unlockedBadges.includes(badgeToUnlock)) {
      const updated = [...unlockedBadges, badgeToUnlock];
      setUnlockedBadges(updated);
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await setDoc(
          userDocRef,
          {
            badges: updated,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Could not save game badge:', e);
      }
    }
  };

  // Handle updating own profile (Name, Emoji Avatar, @ID handle, Bio)
  const handleUpdateOwnProfile = async (updatedFields: Partial<UserProfile>) => {
    if (!currentUser) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userDocRef, updatedFields);
    setCurrentUserProfile((prev) => (prev ? { ...prev, ...updatedFields } : null));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50/40">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          <p className="text-sm font-semibold text-gray-600">กำลังโหลดระบบ...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Google SSO Auth Screen
  if (!currentUser) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col font-sans selection:bg-amber-200">
      {/* Top Navbar with Streak Flame, MiniGame, and Profile Link */}
      <Navbar
        currentUser={currentUser}
        currentUserProfile={currentUserProfile}
        currentTab={currentTab}
        streak={streakStats.current}
        onSelectTab={setCurrentTab}
        onOpenStreakModal={() => setShowStreakModal(true)}
        onOpenGameModal={() => setShowGameModal(true)}
        onOpenInstallModal={() => setShowInstallModal(true)}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 md:px-8 pt-3 sm:pt-6 pb-24 md:pb-8">
        {entriesLoading && entries.length === 0 ? (
          <div className="py-20 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : (
          <>
            {currentTab === 'calendar' && (
              <CalendarView
                entries={entries}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                onSelectDateForEdit={handleSelectDateForEdit}
              />
            )}

            {currentTab === 'entry' && (
              <DailyEntryForm
                currentUser={currentUser}
                entries={entries}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onEntrySaved={handleEntrySaved}
              />
            )}

            {currentTab === 'jar' && (
              <MoodJar
                entries={entries}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                onSelectEntry={(entry) => {
                  setSelectedDate(entry.date);
                }}
              />
            )}

            {currentTab === 'analytics' && (
              <AnalyticsView
                entries={entries}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
              />
            )}

            {currentTab === 'community' && (
              <CommunityView
                currentUser={currentUser}
                currentUserProfile={currentUserProfile}
                onSelectOwnProfile={() => setCurrentTab('profile')}
                onSelectDateForEdit={handleSelectDateForEdit}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
              />
            )}

            {currentTab === 'profile' && currentUserProfile && (
              <UserProfileView
                userProfile={currentUserProfile}
                currentUser={currentUser}
                isOwnProfile={true}
                ownEntries={entries}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                onUpdateOwnProfile={handleUpdateOwnProfile}
                onSelectDateForEdit={handleSelectDateForEdit}
              />
            )}
          </>
        )}
      </main>

      {/* Duolingo Streak & Rewards Modal */}
      {showStreakModal && (
        <StreakRewardsModal
          streak={streakStats.current}
          longestStreak={streakStats.longest}
          unlockedBadgeIds={unlockedBadges}
          recordedDates={entries.map((e) => e.date)}
          onClose={() => setShowStreakModal(false)}
        />
      )}

      {/* Mini-Game Modal */}
      {showGameModal && (
        <MiniGame
          onClose={() => setShowGameModal(false)}
          onGameComplete={handleGameComplete}
        />
      )}

      {/* PWA Install Modal */}
      {showInstallModal && (
        <InstallPwaModal
          deferredPrompt={deferredPrompt}
          onClose={() => setShowInstallModal(false)}
          onInstallSuccess={() => setDeferredPrompt(null)}
        />
      )}

      {/* Footer */}
      <footer className="hidden md:block py-6 text-center text-xs text-gray-400 border-t border-gray-100 bg-white/50">
        <p>Arom Log — สร้างขึ้นเพื่อการดูแลและสังเกตสภาวะอารมณ์ของคุณในทุกๆ วัน</p>
      </footer>
    </div>
  );
}

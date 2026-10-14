import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { logoutUser } from '../firebase.ts';
import { UserProfile } from '../types.ts';
import {
  Sparkles,
  Calendar,
  BarChart3,
  LogOut,
  PenTool,
  Users,
  User as UserIcon,
  Flame,
  Gamepad2,
  Download,
  Coffee,
} from 'lucide-react';

export type TabType = 'calendar' | 'entry' | 'jar' | 'analytics' | 'community' | 'profile';

interface NavbarProps {
  currentUser: User;
  currentUserProfile?: UserProfile | null;
  currentTab?: TabType;
  streak: number;
  onSelectTab?: (tab: TabType) => void;
  onOpenStreakModal: () => void;
  onOpenGameModal: () => void;
  onOpenInstallModal?: () => void;
  onOpenSupportModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentUserProfile,
  currentTab: propCurrentTab,
  streak,
  onSelectTab,
  onOpenStreakModal,
  onOpenGameModal,
  onOpenInstallModal,
  onOpenSupportModal,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = (): TabType => {
    const p = location.pathname;
    if (p.startsWith('/entry')) return 'entry';
    if (p.startsWith('/jar')) return 'jar';
    if (p.startsWith('/analytics')) return 'analytics';
    if (p.startsWith('/community')) return 'community';
    if (p.startsWith('/profile')) return 'profile';
    return 'calendar';
  };

  const activeTab = propCurrentTab || getActiveTab();

  const handleNavClick = (tabId: TabType) => {
    if (onSelectTab) onSelectTab(tabId);
    if (tabId === 'calendar') {
      navigate('/');
    } else {
      navigate(`/${tabId}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navItems: { id: TabType; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    {
      id: 'calendar',
      label: 'ปฏิทิน',
      shortLabel: 'ปฏิทิน',
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'entry',
      label: 'บันทึกวันนี้',
      shortLabel: 'บันทึก',
      icon: <PenTool className="w-4 h-4" />,
    },
    {
      id: 'jar',
      label: 'โหลอารมณ์',
      shortLabel: 'โหลแก้ว',
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      id: 'analytics',
      label: 'บทวิเคราะห์',
      shortLabel: 'สถิติ',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'community',
      label: 'เพื่อน / ชุมชน',
      shortLabel: 'ชุมชน',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'profile',
      label: 'โปรไฟล์ของฉัน',
      shortLabel: 'โปรไฟล์',
      icon: <UserIcon className="w-4 h-4" />,
    },
  ];

  const currentEmoji = currentUserProfile?.avatarEmoji || '😊';
  const currentBg = currentUserProfile?.avatarBg || '#FEF3C7';
  const currentHandle = currentUserProfile?.handle
    ? `@${currentUserProfile.handle.replace(/^@/, '')}`
    : `@${currentUser.uid.substring(0, 6)}`;
  const currentName = currentUserProfile?.displayName || currentUser.displayName || 'ผู้ใช้งาน';

  // Desktop nav tabs: Excludes profile because profile is prominently on the right avatar button
  const desktopNavItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'calendar',
      label: 'ปฏิทิน',
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'entry',
      label: 'บันทึก',
      icon: <PenTool className="w-4 h-4" />,
    },
    {
      id: 'jar',
      label: 'โหลอารมณ์',
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      id: 'analytics',
      label: 'บทวิเคราะห์',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'community',
      label: 'ชุมชน',
      icon: <Users className="w-4 h-4" />,
    },
  ];

  return (
    <>
      {/* Top Header Navbar */}
      <header className="print:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-2xs">
        <div className="max-w-6xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-15 sm:h-16 gap-3">
            {/* Logo */}
            <div
              onClick={() => handleNavClick('calendar')}
              className="flex items-center gap-2.5 cursor-pointer shrink-0 select-none group"
            >
              <img
                src="/arom-icon.png"
                alt="Arom Log Logo"
                className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 group-hover:scale-105 transition-transform object-contain"
              />
              <div className="flex flex-col">
                <h1 className="font-extrabold text-gray-900 text-sm sm:text-base leading-tight tracking-tight">
                  Arom Log
                </h1>
                <span className="text-[10px] text-gray-400 hidden xl:block leading-none mt-0.5">
                  บันทึกอารมณ์ & สุขภาพใจ
                </span>
              </div>
            </div>

            {/* Desktop Navigation Tabs (Spacious, Clean & Non-Cramped) */}
            <nav className="hidden md:flex items-center gap-1 bg-gray-100/70 p-1 rounded-xl border border-gray-200/50">
              {desktopNavItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs lg:text-sm transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-gray-900 font-bold shadow-xs ring-1 ring-gray-200/80'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 font-medium'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Actions: Streak, MiniGame, User Profile Chip & Logout */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Duolingo Streak Flame Button */}
              <button
                type="button"
                onClick={onOpenStreakModal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100/80 text-orange-700 border border-orange-200/60 transition cursor-pointer active:scale-95 text-xs font-bold shadow-2xs"
                title="ดูสถิติต่อเนื่อง & รางวัล (Streak)"
              >
                <Flame className="w-4 h-4 text-orange-500 fill-orange-400" />
                <span>{streak}</span>
              </button>

              {/* MiniGame Button */}
              <button
                type="button"
                onClick={onOpenGameModal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border border-indigo-200/60 transition cursor-pointer active:scale-95 text-xs font-semibold shadow-2xs"
                title="มินิเกมคลายเครียด & สมาธิ (บดขยี้กระดาษ / ค้นหาหน้ายิ้ม)"
              >
                <Gamepad2 className="w-4 h-4 text-indigo-600" />
                <span className="hidden xl:inline text-xs">มินิเกม</span>
              </button>

              {/* Buy Me a Coffee Support Button */}
              {onOpenSupportModal && (
                <button
                  type="button"
                  onClick={onOpenSupportModal}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 text-amber-950 border border-amber-300/80 transition cursor-pointer active:scale-95 text-xs font-bold shadow-2xs group"
                  title="เลี้ยงกาแฟผู้พัฒนา (Buy Me a Coffee)"
                >
                  <Coffee className="w-4 h-4 text-amber-700 group-hover:rotate-12 transition-transform" />
                  <span className="hidden sm:inline text-xs">เลี้ยงกาแฟ</span>
                </button>
              )}

              {/* Install PWA App Button */}
              {onOpenInstallModal && (
                <button
                  type="button"
                  onClick={onOpenInstallModal}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 transition cursor-pointer active:scale-95 text-xs font-semibold shadow-2xs"
                  title="ติดตั้งแอปบนมือถือ / สร้างทางลัด"
                >
                  <Download className="w-4 h-4 text-amber-600" />
                  <span className="hidden lg:inline text-xs font-bold">ติดตั้งแอป</span>
                </button>
              )}

              {/* Subtle divider */}
              <div className="hidden sm:block w-px h-5 bg-gray-200/80 mx-0.5" />

              {/* User Profile Button / Chip */}
              <button
                type="button"
                onClick={() => handleNavClick('profile')}
                className={`flex items-center gap-2 py-1 px-1.5 sm:px-2 rounded-xl border transition-all cursor-pointer ${
                  activeTab === 'profile'
                    ? 'bg-amber-100/90 border-amber-300 ring-2 ring-amber-200 shadow-xs'
                    : 'bg-gray-50/80 hover:bg-amber-50/60 border-gray-200/80'
                }`}
                title="ไปยังโปรไฟล์โซเชียลมีเดียของคุณ"
              >
                <div
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm sm:text-base border border-white shadow-2xs shrink-0 select-none"
                  style={{ backgroundColor: currentBg }}
                >
                  <span>{currentEmoji}</span>
                </div>
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-bold text-gray-800 leading-tight truncate max-w-[85px]">
                    {currentName}
                  </div>
                  <div className="text-[10px] text-amber-900/70 font-mono leading-none truncate max-w-[85px]">
                    {currentHandle}
                  </div>
                </div>
              </button>

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                title="ออกจากระบบ (Logout)"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Fixed Navigation Dock (Native App Style) */}
      <nav className="print:hidden lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 z-50 px-1 py-1 flex justify-around items-center shadow-lg safe-bottom">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`flex-1 py-1 px-0.5 flex flex-col items-center justify-center gap-0.5 rounded-xl transition cursor-pointer ${
                isActive
                  ? 'text-amber-600 font-bold'
                  : 'text-gray-500 hover:text-gray-900 font-medium'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-transform ${
                  isActive ? 'bg-amber-100/80 scale-105 shadow-2xs' : ''
                }`}
              >
                {item.id === 'profile' ? (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                    style={{ backgroundColor: currentBg }}
                  >
                    <span>{currentEmoji}</span>
                  </div>
                ) : (
                  item.icon
                )}
              </div>
              <span className="text-[10px] leading-tight tracking-tight">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};

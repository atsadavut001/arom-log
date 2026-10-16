import {
  emoAngry,
  emoBored,
  emoComfortable,
  emoExcited,
  emoFun,
  emoHappy,
  emoLove,
  emoSad,
  emoShy,
  emoSleepy,
  emoSpeechless,
  emoSurprised,
  emoTired,
  emoWorry,
  MOOD_EMOJI_IMAGES,
} from './assets/emojis/index.ts';

export type MoodCategory =
  | 'happy'
  | 'love'
  | 'excited'
  | 'fun'
  | 'calm'
  | 'comfortable'
  | 'shy'
  | 'surprised'
  | 'speechless'
  | 'bored'
  | 'sleepy'
  | 'tired'
  | 'anxious'
  | 'worry'
  | 'sad'
  | 'angry'
  | 'custom';

export interface MoodPreset {
  type: MoodCategory | string;
  label: string;
  emoji: string; // Unicode fallback
  emojiUrl?: string; // Emoji image URL from src/assets/emojis/
  score: number; // 1 to 5
  color: string;
  bgLight: string;
  borderColor: string;
  isPositive: boolean;
  description: string;
  badgeBg?: string;
}

export const MOOD_PRESETS: MoodPreset[] = [
  {
    type: 'happy',
    label: 'มีความสุข',
    emoji: '😊',
    emojiUrl: emoHappy,
    score: 5,
    color: '#F59E0B',
    bgLight: '#FEF3C7',
    borderColor: '#FCD34D',
    isPositive: true,
    description: 'รู้สึกสดชื่น ร่าเริง สบายใจ'
  },
  {
    type: 'love',
    label: 'มีความรัก / อบอุ่น',
    emoji: '🥰',
    emojiUrl: emoLove,
    score: 5,
    color: '#EC4899',
    bgLight: '#FCE7F3',
    borderColor: '#F472B6',
    isPositive: true,
    description: 'หัวใจฟู อบอุ่น ตกหลุมรัก'
  },
  {
    type: 'excited',
    label: 'ตื่นเต้น / มีพลัง',
    emoji: '🤩',
    emojiUrl: emoExcited,
    score: 5,
    color: '#F97316',
    bgLight: '#FFEDD5',
    borderColor: '#FDBA74',
    isPositive: true,
    description: 'กระตือรือร้น มีไฟ ลุยงานเต็มที่'
  },
  {
    type: 'fun',
    label: 'สนุกสนาน / เฮฮา',
    emoji: '🥳',
    emojiUrl: emoFun,
    score: 5,
    color: '#8B5CF6',
    bgLight: '#EDE9FE',
    borderColor: '#C4B5FD',
    isPositive: true,
    description: 'หัวเราะ มีความสุข สนุกกับชีวิต'
  },
  {
    type: 'calm',
    label: 'สงบ / ผ่อนคลาย',
    emoji: '😌',
    emojiUrl: emoComfortable,
    score: 4,
    color: '#10B981',
    bgLight: '#D1FAE5',
    borderColor: '#6EE7B7',
    isPositive: true,
    description: 'จิตใจนิ่ง สบาย ไม่เร่งรีบ'
  },
  {
    type: 'shy',
    label: 'เขินอาย / ขวยเขิน',
    emoji: '😳',
    emojiUrl: emoShy,
    score: 4,
    color: '#FB7185',
    bgLight: '#FFE4E6',
    borderColor: '#FDA4AF',
    isPositive: true,
    description: 'แก้มแดง เขิน น่ารัก'
  },
  {
    type: 'surprised',
    label: 'ประหลาดใจ',
    emoji: '😲',
    emojiUrl: emoSurprised,
    score: 3,
    color: '#06B6D4',
    bgLight: '#CFFAFE',
    borderColor: '#67E8F9',
    isPositive: true,
    description: 'คาดไม่ถึง ว้าว แปลกใหม่'
  },
  {
    type: 'bored',
    label: 'เบื่อหน่าย / เซ็ง',
    emoji: '🥱',
    emojiUrl: emoBored,
    score: 2,
    color: '#9CA3AF',
    bgLight: '#F3F4F6',
    borderColor: '#E5E7EB',
    isPositive: false,
    description: 'ไม่มีอะไรทำ รู้สึกเซ็งๆ ว่างเปล่า'
  },
  {
    type: 'sleepy',
    label: 'ง่วงนอน / พักผ่อน',
    emoji: '😪',
    emojiUrl: emoSleepy,
    score: 3,
    color: '#6366F1',
    bgLight: '#EEF2FF',
    borderColor: '#C7D2FE',
    isPositive: false,
    description: 'อยากนอน หนังตาหย่อน ต้องการพักผ่อน'
  },
  {
    type: 'tired',
    label: 'เหนื่อยล้า / หมดพลัง',
    emoji: '😴',
    emojiUrl: emoTired,
    score: 2,
    color: '#6B7280',
    bgLight: '#F3F4F6',
    borderColor: '#D1D5DB',
    isPositive: false,
    description: 'เพลีย ล้า อยากพักผ่อน'
  },
  {
    type: 'speechless',
    label: 'พูดไม่ออก / เงียบกริบ',
    emoji: '😶',
    emojiUrl: emoSpeechless,
    score: 2,
    color: '#78716C',
    bgLight: '#F5F5F4',
    borderColor: '#D6D3D1',
    isPositive: false,
    description: 'อึ้ง จุดจุดจุด ไม่รู้จะพูดยังไง'
  },
  {
    type: 'anxious',
    label: 'กังวล / เครียด',
    emoji: '😰',
    emojiUrl: emoWorry,
    score: 2,
    color: '#8B5CF6',
    bgLight: '#EDE9FE',
    borderColor: '#C4B5FD',
    isPositive: false,
    description: 'กระวนกระวาย คิดมาก กดดัน'
  },
  {
    type: 'sad',
    label: 'เศร้า / ดิ่ง',
    emoji: '😢',
    emojiUrl: emoSad,
    score: 1,
    color: '#3B82F6',
    bgLight: '#DBEAFE',
    borderColor: '#93C5FD',
    isPositive: false,
    description: 'เหงา หดหู่ ไม่ค่อยมีความสุข'
  },
  {
    type: 'angry',
    label: 'โกรธ / หงุดหงิด',
    emoji: '😡',
    emojiUrl: emoAngry,
    score: 1,
    color: '#EF4444',
    bgLight: '#FEE2E2',
    borderColor: '#FCA5A5',
    isPositive: false,
    description: 'ฉุนเฉียว ไม่ได้ดั่งใจ ขัดใจ'
  },
  {
    type: 'custom',
    label: 'วาดหน้าตาเอง',
    emoji: '🎨',
    emojiUrl: undefined,
    score: 3,
    color: '#F97316',
    bgLight: '#FFEDD5',
    borderColor: '#FDBA74',
    isPositive: true,
    description: 'วาดหน้าตาแสดงอารมณ์ของคุณเอง'
  }
];

export { MOOD_EMOJI_IMAGES };

export function getMoodEmojiImage(moodType?: string): string | undefined {
  if (!moodType) return undefined;
  if (moodType === 'custom') return undefined; // Hand-drawn canvas is rendered from customDrawing
  return MOOD_EMOJI_IMAGES[moodType] || MOOD_PRESETS.find((p) => p.type === moodType)?.emojiUrl;
}

/**
 * Resolves an avatarEmoji value (which could be an 'emo:<moodType>' ID,
 * a moodType string, an image URL/data URI, or undefined) to a renderable image URL.
 * Returns undefined if avatarEmoji is a standard Unicode string (e.g. '😊', '🐱').
 */
export function getAvatarEmojiImage(avatarEmoji?: string): string | undefined {
  if (!avatarEmoji) return undefined;
  if (avatarEmoji.startsWith('emo:')) {
    const key = avatarEmoji.slice(4);
    return MOOD_EMOJI_IMAGES[key] || getMoodEmojiImage(key);
  }
  if (
    avatarEmoji.startsWith('data:') ||
    avatarEmoji.startsWith('http://') ||
    avatarEmoji.startsWith('https://') ||
    avatarEmoji.startsWith('/') ||
    avatarEmoji.includes('.png') ||
    avatarEmoji.includes('.svg') ||
    avatarEmoji.includes('.webp')
  ) {
    return avatarEmoji;
  }
  if (MOOD_EMOJI_IMAGES[avatarEmoji]) {
    return MOOD_EMOJI_IMAGES[avatarEmoji];
  }
  return undefined;
}

export interface ScaleMoodLevel {
  score: number; // 0 to 10
  label: string;
  emoji: string;
  color: string;
  bgLight: string;
  borderColor: string;
  description: string;
  isPositive: boolean;
  moodType: MoodCategory;
}

export const SCALE_0_10_LEVELS: ScaleMoodLevel[] = [
  {
    score: 0,
    label: '0/10 - แย่มากที่สุด',
    emoji: '😫',
    color: '#DC2626',
    bgLight: '#FEE2E2',
    borderColor: '#F87171',
    description: 'ทุกข์ใจ ดิ่งมาก ไม่ไหวแล้ว (0 = แย่ที่สุด)',
    isPositive: false,
    moodType: 'angry',
  },
  {
    score: 1,
    label: '1/10 - แย่มาก',
    emoji: '😞',
    color: '#EF4444',
    bgLight: '#FEE2E2',
    borderColor: '#FCA5A5',
    description: 'รู้สึกแย่มาก หดหู่',
    isPositive: false,
    moodType: 'sad',
  },
  {
    score: 2,
    label: '2/10 - แย่',
    emoji: '😢',
    color: '#F43F5E',
    bgLight: '#FFE4E6',
    borderColor: '#FDA4AF',
    description: 'เศร้า เสียใจ ไม่มีความสุข',
    isPositive: false,
    moodType: 'sad',
  },
  {
    score: 3,
    label: '3/10 - ค่อนข้างแย่',
    emoji: '😰',
    color: '#F97316',
    bgLight: '#FFEDD5',
    borderColor: '#FDBA74',
    description: 'กังวล เครียด ไม่ค่อยสบายใจ',
    isPositive: false,
    moodType: 'anxious',
  },
  {
    score: 4,
    label: '4/10 - ไม่ค่อยดี',
    emoji: '🙁',
    color: '#FB923C',
    bgLight: '#FFF7ED',
    borderColor: '#FED7AA',
    description: 'เหนื่อย หน่วงๆ พลังงานต่ำ',
    isPositive: false,
    moodType: 'tired',
  },
  {
    score: 5,
    label: '5/10 - ปานกลาง / เฉยๆ',
    emoji: '😐',
    color: '#EAB308',
    bgLight: '#FEF9C3',
    borderColor: '#FDE047',
    description: 'เรื่อยๆ ธรรมดา พออยู่ได้',
    isPositive: true,
    moodType: 'calm',
  },
  {
    score: 6,
    label: '6/10 - พอใช้ได้',
    emoji: '🙂',
    color: '#84CC16',
    bgLight: '#ECFCCB',
    borderColor: '#BEF264',
    description: 'รู้สึกโอเค สบายๆ มีเรื่องดีบ้าง',
    isPositive: true,
    moodType: 'calm',
  },
  {
    score: 7,
    label: '7/10 - ค่อนข้างดี',
    emoji: '😌',
    color: '#10B981',
    bgLight: '#D1FAE5',
    borderColor: '#6EE7B7',
    description: 'สงบ สบายใจ วันที่ดีวันหนึ่ง',
    isPositive: true,
    moodType: 'calm',
  },
  {
    score: 8,
    label: '8/10 - ดี / มีความสุข',
    emoji: '😊',
    color: '#06B6D4',
    bgLight: '#CFFAFE',
    borderColor: '#67E8F9',
    description: 'มีความสุข ร่าเริง สดใส',
    isPositive: true,
    moodType: 'happy',
  },
  {
    score: 9,
    label: '9/10 - มีความสุขมาก',
    emoji: '😄',
    color: '#3B82F6',
    bgLight: '#DBEAFE',
    borderColor: '#93C5FD',
    description: 'สดชื่น ยิ้มแย้ม พลังบวกเต็มเปี่ยม',
    isPositive: true,
    moodType: 'happy',
  },
  {
    score: 10,
    label: '10/10 - มีความสุขที่สุด',
    emoji: '🤩',
    color: '#F59E0B',
    bgLight: '#FEF3C7',
    borderColor: '#FCD34D',
    description: 'ยอดเยี่ยมที่สุด วันที่วิเศษมาก! (10 = มีความสุข)',
    isPositive: true,
    moodType: 'excited',
  },
];

export const DEFAULT_TAGS = [
  '#งาน',
  '#ครอบครัว',
  '#ออกกำลังกาย',
  '#การเรียน',
  '#เพื่อนฝูง',
  '#คนรัก',
  '#อาหารอร่อย',
  '#เล่นเกม',
  '#ดูหนังฟังเพลง',
  '#ท่องเที่ยว',
  '#นอนหลับ',
  '#ช้อปปิ้ง'
];

export interface MoodEntry {
  id: string; // date YYYY-MM-DD
  userId: string;
  date: string; // YYYY-MM-DD
  moodType: MoodCategory | string;
  moodLabel: string;
  moodScore: number;
  moodColor: string;
  customDrawing?: string; // base64 / data URL
  tags: string[];
  note: string;
  photoUrl?: string; // data URL or image link
  isPublic?: boolean;
  likes?: string[]; // Array of user IDs who liked
  likesCount?: number;
  createdAt: string;
  updatedAt: string;
}

// Social post on a user's profile feed: a hand-drawn emoji image + short text, posted like a social media post
// Stored at /users/{userId}/posts/{postId} (same identity isolation pattern as MoodEntry)
export interface SocialPost {
  id: string;
  userId: string;
  drawing?: string; // data URL of the drawn emoji (canvas), optional
  text?: string; // post message, optional
  likes?: string[]; // Array of user IDs who liked
  likesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string; // Uploaded profile photo (256x256 JPEG data URL from Edit Profile modal) or Google account photo
  avatarEmoji?: string; // Anonymity-friendly emoji avatar e.g. 🐱, 🦊, 😊
  avatarBg?: string; // Hex background color for avatar e.g. #FEF3C7
  handle?: string; // Search handle e.g. happy_cat without @ or with @
  bio?: string;
  isPrivate?: boolean; // When true, profile is hidden from other users in Social (invisible / unsearchable)
  streak?: number;
  longestStreak?: number;
  lastActiveDate?: string;
  badges?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StreakBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  requiredStreak?: number;
  category: 'streak' | 'activity' | 'mindfulness';
}

export const STREAK_BADGES: StreakBadge[] = [
  {
    id: 'first_step',
    title: 'ก้าวแรกแห่งใจ',
    description: 'บันทึกอารมณ์วันแรกสำเร็จ เริ่มต้นการดูแลใจ',
    icon: '🌱',
    requiredStreak: 1,
    category: 'streak',
  },
  {
    id: 'streak_3',
    title: 'ประกายไฟเริ่มติด',
    description: 'บันทึกติดต่อกัน 3 วัน ไฟแห่งความตั้งใจเริ่มลุกโชน',
    icon: '🔥',
    requiredStreak: 3,
    category: 'streak',
  },
  {
    id: 'streak_7',
    title: 'ผู้พิทักษ์เปลวไฟ 7 วัน',
    description: 'บันทึกติดต่อกันครบ 1 สัปดาห์ นิสัยที่ดีกำลังก่อตัว',
    icon: '⚡',
    requiredStreak: 7,
    category: 'streak',
  },
  {
    id: 'streak_14',
    title: 'โหลแก้วเรืองแสง 14 วัน',
    description: 'บันทึกต่อเนื่อง 2 สัปดาห์ สะสมความทรงจำครึ่งเดือน',
    icon: '🏺',
    requiredStreak: 14,
    category: 'streak',
  },
  {
    id: 'streak_30',
    title: 'จิตใจมั่นคง 30 วัน',
    description: 'บันทึกต่อเนื่องครบ 1 เดือนเต็ม สุดยอดพลังแห่งวินัย',
    icon: '👑',
    requiredStreak: 30,
    category: 'streak',
  },
  {
    id: 'custom_artist',
    title: 'ศิลปินหน้าตาอารมณ์',
    description: 'วาดหน้าตาอารมณ์ด้วยฝีมือตัวเองผ่าน Canvas',
    icon: '🎨',
    category: 'activity',
  },
  {
    id: 'mindful_peace',
    title: 'ผู้ฝึกจิตใจนิ่ง',
    description: 'ค้นหาใบหน้ายิ้มในมินิเกมจนพบความสงบและสมาธิ',
    icon: '🧘',
    category: 'mindfulness',
  },
  {
    id: 'social_heart',
    title: 'ผู้มอบพลังใจ',
    description: 'ส่งมอบหัวใจสนับสนุนให้โพสต์ของเพื่อนในชุมชน',
    icon: '💖',
    category: 'activity',
  },
  {
    id: 'vent_shredder',
    title: 'ผู้ปลดปล่อยความอึดอัด',
    description: 'เขียนระบายความหงุดหงิดแล้วบดขยี้หรือเผาทำลายทิ้งสำเร็จ',
    icon: '🌪️',
    category: 'mindfulness',
  },
];

export interface MiniGameRoundRecord {
  round: number;
  setIndex: 1 | 2 | 3; // 1: Warm-up 3x3, 2: Focus 4x4, 3: Flow 5x5
  gridSize: number; // 3, 4, 5
  reactionTimeMs: number;
  timestamp: number;
}

export const isLegacyDefaultBio = (bio?: string | null): boolean => {
  if (!bio) return true;
  const trimmed = bio.trim();
  return (
    trimmed === '' ||
    trimmed === 'กำลังดูแลสุขภาพใจและบันทึกอารมณ์ในทุกๆ วัน 🌱' ||
    trimmed === 'กำลังดูแลสุขภาพใจและบันทึกอารมณ์ในทุกๆ วัน' ||
    trimmed === 'กำลังดูแลสุขภาพใจในทุกๆ วัน'
  );
};



# 🌈 Arom Log — ไดอารีอารมณ์รายวัน

Arom Log คือเว็บแอปบันทึกอารมณ์ประจำวันที่ช่วยให้คุณจดจ่อกับความรู้สึกของตัวเอง วาดหน้าตาอารมณ์ เก็บอารมณ์เป็นขวดโหลฟิสิกส์ (Mood Jar) ดูสถิติรายเดือน และแชร์บันทึกกับชุมชนได้อย่างปลอดภัย

---

## ✨ ฟีเจอร์ของระบบ

### 📖 บันทึกอารมณ์รายวัน (Daily Entry)
- โหมดบันทึกพร้อม **Mood Selector** — เลือกประเภทอารมณ์จากพรีเซ็ตพร้อมคะแนน (0–10) และโทนสีประจำอารมณ์
- เขียนโน้ตถึงตัวเอง พร้อมระบบ **แท็ก** จัดหมวดความรู้สึก
- **ผืนผ้าใบวาดหน้าตาอารมณ์ (Canvas Drawer)** — วาดได้อิสระแล้วบันทึกพร้อมรายการ
- สลับดู/แก้ไขรายการย้อนหลังผ่านปฏิทิน

### 📅 ปฏิทินอารมณ์ (Calendar View)
- แสดงอารมณ์ของแต่ละวันในรูปแบบสี ไล่ดูเดือน ย้อนหลังได้
- คลิกวันที่เพื่อเปิดเขียนหรือแก้ไขบันทึกของวันนั้น

### 🫙 ขวดโหลอารมณ์ (Mood Jar)
- ขวดโหลอารมณ์แบบ **ฟิสิกส์จริง (Matter.js)** — แต่ละบันทึกกลายเป็นลูกบอลสีตามอารมณ์ที่ตกลงมาในขวดและกระทบกันได้
- ยิ่งมีบันทึกมาก ขวดยิ่งเติมเต็ม เปรียบเสมือนความทรงจำอารมณ์ที่สะสมไว้

### 📊 สถิติรายเดือน (Analytics)
- **อารมณ์เด่น (Dominant Mood)** พร้อมเปอร์เซ็นต์ของเดือน
- **คะแนนอารมณ์เฉลี่ย** ตั้งแต่ 0–10
- นับจำนวนวันที่บันทึก วันฮาย/วันโลว์ และแนวโน้มช่วงเดือน

### 🔥 Streak & รางวัล (Streak Rewards)
- นับ **streak บันทึกต่อเนื่อง** พร้อมสถิติ streak ยาวนานที่สุด (เป็นข้อมูลโปรไฟล์)
- **ปลดล็อก Badge** ตามความสม่ำเสมอ และมี Modal ฉลองด้วย **แอนิเมชันเคลื่อนไหวและ confetti**
- โบนัส **Mini Game** ที่เปิดเล่นได้เมื่อครบเงื่อนไข

### 🌍 ชุมชน (Community)
- ค้นหาผู้ใช้คนอื่น กด**ติดตาม/เลิกติดตาม** และดูโปรไฟล์แบบครบวงจร
- บันทึกที่ตั้งเป็นสาธารณะ (`isPublic`) สามารถกด**หัวใจ (Like)** ได้จากผู้ใช้คนอื่น
- กรองดูรายชื่อ “ทั้งหมด” หรือ “ที่คุณติดตาม”

### 👤 โปรไฟล์ผู้ใช้ (User Profile)
- ตั้งชื่อแสดง, **@handle**, bio และเลือก **avatar (อิโมจิ/สีพื้นหลัง)**
- แสดง streak, longest streak และแกลเลรี badge ที่ปลดล็อก

### 💥 ปลดปล่อยอารมณ์ (Vent & Destroy)
- มินิเกม**สร้างสรรค์เชิงจิตวิทยา** — เขียนสิ่งที่อยากระบาย แล้วทำลาย/ปล่อยทิ้งช่วยคลายความเครียด

### 🔐 ความปลอดภัย
- ล็อกอินผ่าน **Google Sign-in** เท่านั้น
- ข้อมูลทุกรายการเป็นของผู้ใช้เอง (`users/{uid}/entries`) แยกชัดเจน
- **Firestore Security Rules แบบเข้มงวด** (`firestore.rules`) — ใช้ปิด global access ตรวจ schema ทุกฟิลด์ (type, max length, range), บังคับ owner ของทุก write และอนุญาตให้คนอื่นแตะได้เฉพาะฟิลด์ `likes`/`likesCount` เท่านั้น

---

## 🛠 เทคโนโลยีที่ใช้

| หมวด | เทคโนโลยี |
|---|---|
| Frontend | [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) |
| Build tool | [Vite 8](https://vite.dev) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) (ผ่าน `@tailwindcss/vite`) |
| Icons / Motion | [lucide-react](https://lucide.dev) · [Motion](https://motion.dev) · [canvas-confetti](https://github.com/catdad/canvas-confetti) |
| Physics | [Matter.js](https://brm.io/matter-js/) — สำหรับ Mood Jar |
| Backend / Infra | [Firebase](https://firebase.google.com) — **Authentication** (Google) + **Cloud Firestore** (custom database id) |
| Font | Google Fonts — Prompt + Plus Jakarta Sans |
| Hosting | ออกแบบให้ deploy บน [Vercel](https://vercel.com) (Static build → `dist/`) |

### โครงสร้างโปรเจกต์

```
├── index.html                     # จุดเริ่ม HTML
├── firestore.rules               # Firebase Security Rules
├── vite.config.ts                # Vite config (alias @/, Tailwind plugin)
├── package.json
├── src/
│   ├── App.tsx                   # จัดการ auth, state กลาง, routing แบบ tab
│   ├── firebase.ts              # เชื่อม Firebase Auth + Firestore + error helper
│   ├── types.ts                  # โมเดล MoodEntry / UserProfile / mood presets
│   ├── index.css                 # Tailwind entry
│   ├── components/
│   │   ├── AuthScreen.tsx        # หน้าล็อกอิน
│   │   ├── DailyEntryForm.tsx    # ฟอร์มบันทึกรายวัน
│   │   ├── CanvasDrawer.tsx      # ผืนผ้าใบวาดหน้าตาอารมณ์
│   │   ├── MoodSelector.tsx      # เลือกอารมณ์ + คะแนน
│   │   ├── CalendarView.tsx      # ปฏิทินอารมณ์
│   │   ├── MoodJar.tsx           # ขวดโหลอารมณ์ (Matter.js)
│   │   ├── AnalyticsView.tsx     # สถิติรายเดือน
│   │   ├── CommunityView.tsx     # ชุมชน (ติดตาม / หัวใจ / ค้นหา)
│   │   ├── UserProfileView.tsx   # โปรไฟล์ผู้ใช้
│   │   ├── StreakRewardsModal.tsx# รางวัล streak + badges
│   │   ├── MiniGame.tsx          # มินิเกมโบนัส
│   │   ├── VentAndDestroyGame.tsx# ปลดปล่อยอารมณ์
│   │   └── Navbar.tsx            # ตัวสลับแท็บ
│   └── utils/audio.ts            # ตัวช่วยเล่นเสียง
```

---

## 🚀 การติดตั้งและรันในเครื่อง

**สิ่งที่ต้องมี:** Node.js (แนะนำ 22+)

1. ติดตั้ง dependencies:
   ```bash
   npm install
   ```
2. สร้างไฟล์ `.env` จากตัวอย่าง แล้วใส่ค่า Firebase ของโปรเจกต์คุณ:
   ```bash
   cp .env.example .env
   ```
   ตัวแปรที่ต้องใส่ (เป็นตัวแปรฝั่ง client จึงต้องมี prefix `VITE_`):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_FIRESTORE_DATABASE_ID` ← **สำคัญ** ต้องเป็น database id ของโปรเจกต์คุณ (แอปจะ error ทันทีถ้าไม่มี)
3. รันโหมดพัฒนา:
   ```bash
   npm run dev
   ```
4. Build สำหรับ production:
   ```bash
   npm run build     # ผลลัพธ์อยู่ที่ dist/
   npm run preview   # พรีวิว build จริง
   npm run lint      # ตรวจ TypeScript
   ```

---

## 🌐 Deploy บน Vercel

1. Import repository นี้ในหน้า [vercel.com/new](https://vercel.com/new) — Vercel จะ detect เป็น Vite อัตโนมัติ (Build: `vite build`, Output: `dist`)
2. เพิ่มตัวแปรสภาพแวดล้อม `VITE_*` ทั้ง 7 ตัวใน **Project Settings → Environment Variables**
3. หลัง deploy:
   - เพิ่มโดเมนที่ได้ (เช่น `<project>.vercel.app`) ใน **Firebase Console → Authentication → Settings → Authorized domains**
   - Deploy กฎความปลอดภัย: `firebase deploy --only firestore:rules`

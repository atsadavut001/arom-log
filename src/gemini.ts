/**
 * Mood Insight — Gemini-powered emotional summaries for Arom Log
 * Confidential & supportive tone, Thai language, never a medical diagnosis.
 *
 * API key resolution order:
 *   1. import.meta.env.VITE_GEMINI_API_KEY  (Vite env: .env file or Vercel project env)
 *   2. GEMINI_API_KEY bridged via `define` in vite.config.ts (AI Studio applet pattern)
 */
import { GoogleGenAI } from '@google/genai';
import { MoodEntry } from './types.ts';

const getApiKey = (): string => {
  try {
    if (typeof (import.meta as any)?.env !== 'undefined') {
      const viteKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
      if (viteKey) return viteKey;
    }
  } catch {
    // ignore
  }

  try {
    if (typeof process !== 'undefined' && process.env) {
      const procKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (procKey) return procKey;
    }
  } catch {
    // ignore
  }

  return '';
};

const apiKey = getApiKey();

export const isGeminiConfigured = (): boolean => apiKey.length > 0;

let client: GoogleGenAI | null = null;
const getClient = (): GoogleGenAI => {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING — กรุณาตั้งค่า VITE_GEMINI_API_KEY หรือ GEMINI_API_KEY ใน .env แล้ว build ใหม่');
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }
  return client;
};

export interface MoodInsightRequest {
  monthLabel: string; // e.g. "ตุลาคม 2569"
  entries: MoodEntry[]; // entries for the month being analyzed
}

const SYSTEM_INSTRUCTION = `คุณคือ "ผู้ช่วยดูแลใจ" อ่อนโยนในแอปบันทึกอารมณ์ภาษาไทยชื่อ Arom Log

ข้อมูลอินพุต: บันทึกอารมณ์รายวัน (วันที่, อารมณ์+คะแนน 0-10, แฮชแท็กกิจกรรม, โน้ตสั้น)

กติกา:
- เขียนภาษาไทยเป็นกันเอง อบอุ่น สนับสนุน ไม่ตัดสิน ไม่ตำหนิ
- สรุป 4-8 ประโยค แบ่งเป็นย่อหน้าสั้นตามธีม: ภาพรวมของเดือน, กิจกรรมที่ช่วยให้รู้สึกดี, สิ่งที่มักมาคู่กับความเหนื่อยหรือเครียด, และคำกลอมปลอบ/ชวนสังเกตใจ
- อิงข้อเท็จจริงจากข้อมูลที่ให้เท่านั้น ห้ามแต่งเรื่องหรืออ้างข้อมูลที่ไม่มี
- คุณไม่ใช่แพทย์: ห้ามวินิจฉัย ห้ามให้การรักษา ไม่ใช้ศัพท์ทางการแพทย์จัดการ
- หากพบอารมณ์ลบต่อเนื่องหรือคะแนนต่ำมากหลายวัน ชวนเบา ๆ ว่าการพูดคุยกับผู้เชี่ยวชาญด้านจิตใจเป็นสิ่งที่ดีหาใช้ และระบุว่ามี "สายด่วนสุขภาพจิต 1323 ฟรีทุกเครือข่าย 24 ชม." รับทราบเพียงครั้งเดียว
- ปิดท้ายด้วยกำลังใจสั้น ๆ หนึ่งประโยค`;

export async function generateMoodInsight({ monthLabel, entries }: MoodInsightRequest): Promise<string> {
  const ai = getClient();

  // Compact payload: cap 60 entries + short notes keeps the request small and removes drawings/photos (privacy-first)
  const payload = {
    month: monthLabel,
    totalEntries: entries.length,
    entries: entries.slice(0, 60).map((e) => ({
      date: e.date,
      mood: `${e.moodLabel} (${e.moodScore}/10)`,
      tags: (e.tags || []).slice(0, 8),
      note: (e.note || '').slice(0, 200),
    })),
  };

  const contents = [
    `ข้อมูลบันทึกอารมณ์ของผู้ใช้ (JSON):`,
    JSON.stringify(payload),
    '',
    `กรุณาเขียน Mood Insight สรุปอารมณ์ภาษาไทย ตามรูปแบบและกติกาที่กำหนด`,
  ].join('\n');

  const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
  let lastError: unknown = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
          maxOutputTokens: 900,
        },
      });

      const text = (response.text || '').trim();
      if (text) {
        return text;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[Mood Insight] Model ${model} failed, attempting next candidate...`, err);
    }
  }

  throw lastError || new Error('คำตอบจาก AI ว่างเปล่า กรุณาลองใหม่อีกครั้ง');
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SocialPost } from '../types.ts';
import { playPaperShredderSound } from '../utils/audio.ts';
import {
  Scissors,
  X,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Flame,
  FileText
} from 'lucide-react';

interface PaperShredderModalProps {
  post: SocialPost;
  authorName: string;
  authorEmoji?: string;
  authorBg?: string;
  authorPhotoURL?: string;
  isDraft?: boolean;
  onConfirmDelete: () => Promise<void> | void;
  onClose: () => void;
}

const STRIP_COUNT = 14;

export const PaperShredderModal: React.FC<PaperShredderModalProps> = ({
  post,
  authorName,
  authorEmoji = '😊',
  authorBg = '#FEF3C7',
  authorPhotoURL,
  isDraft = false,
  onConfirmDelete,
  onClose,
}) => {
  // Status: 'idle' (waiting confirmation) | 'shredding' (animating) | 'done' (deleted)
  const [status, setStatus] = useState<'idle' | 'shredding' | 'done'>('idle');

  // Handle start shredding process
  const handleStartShredding = async () => {
    if (status !== 'idle') return;
    setStatus('shredding');

    // 1. Play mechanical paper shredder sound (motor + tearing noise)
    const stopAudio = playPaperShredderSound(2.2);

    // 2. Wait for paper to feed into blades and finish shredding
    setTimeout(async () => {
      try {
        await onConfirmDelete();
        setStatus('done');
      } catch (err) {
        console.error('Failed to delete post:', err);
        stopAudio();
        onClose();
        return;
      }

      // Close modal after brief success presentation
      setTimeout(() => {
        onClose();
      }, 700);
    }, 2200);
  };

  // Keyboard escape key support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status === 'idle') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-stone-900 border-2 border-stone-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* SHREDDER TOP CONTROL PANEL */}
        <div className="bg-stone-950 border-b border-stone-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-mono font-black text-amber-400 tracking-wider flex items-center gap-1.5">
                <span>AROM-SHRED 3000</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded font-bold">
                  HEAVY DUTY
                </span>
              </div>
              <div className="text-[10px] text-stone-400 font-mono">
                {isDraft ? 'บดทำลายร่างโพสต์ที่ยังไม่เผยแพร่' : 'เครื่องบดทำลายเอกสารโพสต์'}
              </div>
            </div>
          </div>

          {/* LED Status Indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-900 border border-stone-800">
              <span
                className={`w-2 h-2 rounded-full ${
                  status === 'idle'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34D399] animate-pulse'
                    : status === 'shredding'
                    ? 'bg-rose-500 shadow-[0_0_10px_#F43F5E] animate-ping'
                    : 'bg-emerald-400 shadow-[0_0_8px_#34D399]'
                }`}
              />
              <span className="text-[10px] font-mono font-bold text-stone-300 uppercase">
                {status === 'idle'
                  ? 'พร้อมใช้งาน'
                  : status === 'shredding'
                  ? 'กำลังบดทำลาย'
                  : 'ทำลายสำเร็จ'}
              </span>
            </div>

            {status === 'idle' && (
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition flex items-center justify-center cursor-pointer"
                title="ยกเลิก"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* HAZARD CAUTION TAPE STRIP */}
        <div
          className="h-2 w-full opacity-70"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #F59E0B 0, #F59E0B 10px, #1C1917 10px, #1C1917 20px)',
          }}
        />

        {/* SHREDDER WORKSPACE: INTAKE + SLIT + OUTPUT BIN */}
        <motion.div
          animate={
            status === 'shredding'
              ? {
                  x: [-1.5, 1.5, -1, 1, -1.5, 0],
                  y: [-0.8, 0.8, -0.5, 0.5, 0],
                }
              : { x: 0, y: 0 }
          }
          transition={{
            repeat: status === 'shredding' ? Infinity : 0,
            duration: 0.1,
          }}
          className="p-5 flex flex-col items-center justify-center relative bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950"
        >
          {/* ========================================================================= */}
          {/* 1. UPPER INTAKE: THE POST AS A SHEET OF PAPER SLIDING DOWN INTO BLADES     */}
          {/* ========================================================================= */}
          <div className="relative w-full max-w-xs h-48 overflow-hidden rounded-t-2xl border-x-2 border-t-2 border-stone-800 bg-stone-950/60 shadow-inner flex flex-col justify-end">
            <motion.div
              initial={{ y: 0, opacity: 1 }}
              animate={
                status === 'shredding'
                  ? {
                      y: 195, // Pulls down completely through the blade slot
                      opacity: [1, 1, 0.8, 0.2],
                    }
                  : { y: 0, opacity: 1 }
              }
              transition={{
                duration: 2.1,
                ease: 'linear',
              }}
              className="relative w-full bg-[#FCFBF7] text-stone-900 p-3.5 rounded-t-xl shadow-lg border-t-4 border-amber-500 font-sans space-y-2 select-none"
            >
              {/* Paper Watermark Stamp */}
              <div className="absolute right-2 top-2 opacity-25 pointer-events-none text-right">
                <div className="text-[10px] font-mono font-bold tracking-widest text-red-600 uppercase border border-red-600 px-1 rounded rotate-12">
                  {isDraft ? 'UNPOSTED DRAFT' : 'TO BE SHREDDED'}
                </div>
              </div>

              {/* Author & Header */}
              <div className="flex items-center gap-2 pb-1.5 border-b border-stone-200">
                <div
                  className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-xs shadow-xs border border-stone-300 shrink-0"
                  style={{ backgroundColor: authorBg }}
                >
                  {authorPhotoURL ? (
                    <img
                      src={authorPhotoURL}
                      alt={authorName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{authorEmoji}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-stone-900 truncate">
                    {authorName}
                  </div>
                  <div className="text-[9px] text-stone-400 font-mono">
                    {isDraft ? 'ร่างโพสต์ (ยังไม่ได้เผยแพร่)' : `เอกสารโพสต์ • ID: ${post.id.slice(0, 8)}`}
                  </div>
                </div>
              </div>

              {/* Post Drawing thumbnail if any */}
              {post.drawing && (
                <div className="w-full h-16 rounded-lg bg-amber-50/70 border border-stone-200 flex items-center justify-center overflow-hidden">
                  <img
                    src={post.drawing}
                    alt="post drawing"
                    className="h-full w-auto object-contain p-1"
                  />
                </div>
              )}

              {/* Post Note Text */}
              {post.text ? (
                <p className="text-[11px] text-stone-700 leading-tight line-clamp-3 bg-amber-50/40 p-1.5 rounded border border-amber-100">
                  {post.text}
                </p>
              ) : (
                <p className="text-[10px] text-stone-400 italic">
                  ไม่มีข้อความบันทึก
                </p>
              )}
            </motion.div>
          </div>

          {/* ========================================================================= */}
          {/* 2. THE MECHANICAL SHREDDER SLIT & ROTATING GEAR BLADES                     */}
          {/* ========================================================================= */}
          <div className="relative w-full max-w-sm z-20">
            {/* Slot Outer Bevel */}
            <div className="w-full h-6 bg-gradient-to-r from-stone-800 via-stone-700 to-stone-800 rounded-lg p-0.5 border border-stone-600 shadow-md flex items-center justify-center">
              {/* Inner Dark Slot with Rotary Cutters */}
              <div className="relative w-full h-full bg-stone-950 rounded flex items-center justify-around px-4 overflow-hidden shadow-inner">
                {/* 2 Spinning Blade Cogwheels */}
                <motion.div
                  animate={
                    status === 'shredding'
                      ? { rotate: 360 }
                      : { rotate: 0 }
                  }
                  transition={{
                    repeat: status === 'shredding' ? Infinity : 0,
                    duration: 0.25,
                    ease: 'linear',
                  }}
                  className="text-stone-500 opacity-60"
                >
                  <Settings className="w-4 h-4" />
                </motion.div>
                <div className="h-0.5 flex-1 bg-stone-800/80 mx-2" />
                <motion.div
                  animate={
                    status === 'shredding'
                      ? { rotate: -360 }
                      : { rotate: 0 }
                  }
                  transition={{
                    repeat: status === 'shredding' ? Infinity : 0,
                    duration: 0.25,
                    ease: 'linear',
                  }}
                  className="text-stone-500 opacity-60"
                >
                  <Settings className="w-4 h-4" />
                </motion.div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. LOWER OUTPUT: SHREDDED PAPER STRIPS FALLING DOWN INTO BIN               */}
          {/* ========================================================================= */}
          <div className="relative w-full max-w-xs h-36 bg-gradient-to-b from-stone-950/90 via-stone-950/70 to-stone-900/60 rounded-b-2xl border-x-2 border-b-2 border-stone-800 p-2 overflow-hidden flex justify-center items-start">
            {/* Shredded paper strips */}
            {status === 'shredding' && (
              <div className="relative w-full h-full flex justify-between px-1">
                {Array.from({ length: STRIP_COUNT }).map((_, idx) => {
                  const randomRotate = ((idx % 5) - 2) * 5; // e.g. -10deg to +10deg
                  const randomDelay = (idx % 7) * 0.12 + 0.15;
                  const randomHeight = 80 + (idx % 4) * 20;

                  return (
                    <motion.div
                      key={`shred-strip-${idx}`}
                      initial={{ y: -30, opacity: 0, scaleY: 0.2 }}
                      animate={{
                        y: [0, 50, 110],
                        opacity: [0, 1, 1],
                        scaleY: [0.2, 1, 1],
                        rotate: [0, randomRotate * 0.5, randomRotate],
                      }}
                      transition={{
                        delay: randomDelay,
                        duration: 1.2,
                        repeat: Infinity,
                        repeatDelay: 0.3,
                        ease: 'easeIn',
                      }}
                      style={{
                        height: `${randomHeight}px`,
                      }}
                      className="w-2.5 sm:w-3 bg-gradient-to-b from-[#FCFBF7] via-[#F5F2E8] to-[#E5E0D0] rounded-xs shadow-xs border-x border-stone-300/40 relative"
                    >
                      {/* Faint text/drawing ink stripe simulation */}
                      <div className="absolute inset-x-0.5 top-2 h-1 bg-stone-400/40 rounded-full" />
                      <div className="absolute inset-x-0.5 top-5 h-2 bg-amber-400/50 rounded-xs" />
                      <div className="absolute inset-x-0.5 top-9 h-1.5 bg-stone-500/40 rounded-full" />
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Waste bin pile accumulation at the bottom */}
            {status === 'shredding' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="absolute bottom-1 inset-x-4 h-6 bg-gradient-to-t from-stone-200 via-amber-100 to-transparent rounded-full opacity-60 blur-xs"
              />
            )}

            {/* Idle prompt state inside bin */}
            {status === 'idle' && (
              <div className="w-full h-full flex flex-col items-center justify-center text-stone-500 space-y-1">
                <Scissors className="w-6 h-6 text-stone-600" />
                <span className="text-[11px] font-mono text-stone-400">
                  ช่องรับเศษกระดาษ (SHRED BIN)
                </span>
              </div>
            )}

            {/* Done state */}
            {status === 'done' && (
              <div className="w-full h-full flex flex-col items-center justify-center text-emerald-400 space-y-1 animate-in zoom-in-95 duration-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300">
                  {isDraft ? 'บดทำลายร่างโพสต์สำเร็จ!' : 'บดทำลายโพสต์สำเร็จ!'}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* BOTTOM ACTION BAR */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between gap-3">
          {status === 'idle' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition cursor-pointer"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={handleStartShredding}
                className="flex-1 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white text-xs font-black shadow-lg shadow-red-950/60 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Scissors className="w-4 h-4" />
                <span>{isDraft ? 'บดทำลายร่างนี้ทิ้ง ✂️' : 'บดทำลายโพสต์นี้ ✂️'}</span>
              </button>
            </>
          ) : status === 'shredding' ? (
            <div className="w-full py-1 text-center flex items-center justify-center gap-2 text-amber-400 font-mono text-xs font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>กำลังบดทำลายเอกสารโพสต์ กรุณารอสักครู่...</span>
            </div>
          ) : (
            <div className="w-full py-1 text-center text-emerald-400 font-mono text-xs font-bold flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isDraft
                  ? 'ร่างโพสต์ถูกทำลายทิ้งเรียบร้อย'
                  : 'โพสต์ถูกทำลายและลบออกจากระบบเรียบร้อย'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

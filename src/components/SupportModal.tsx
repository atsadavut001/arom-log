import React, { useState } from 'react';
import { Coffee, Heart, ExternalLink, Copy, Check, X, Sparkles } from 'lucide-react';

interface SupportModalProps {
  onClose: () => void;
}

export const SUPPORT_URL = 'https://buymeacoffee.com/zberus_studio';

export const SupportModal: React.FC<SupportModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = SUPPORT_URL;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-gradient-to-b from-[#FFFDF9] to-[#FFF9EE] rounded-3xl border-2 border-amber-200/90 shadow-2xl p-6 sm:p-7 relative overflow-hidden text-center space-y-5"
      >
        {/* Decorative background glows */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-300/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-orange-300/20 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 hover:bg-amber-100/70 rounded-full transition cursor-pointer"
          title="ปิดหน้าต่าง"
          aria-label="ปิด"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon Badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 rotate-3 hover:rotate-0 transition-transform">
          <Coffee className="w-8 h-8 drop-shadow-xs" />
        </div>

        {/* Title & Introduction */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/80 text-amber-900 border border-amber-200/60 text-[11px] font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Support Arom Log</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            เลี้ยงกาแฟผู้พัฒนา ☕
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed px-1">
            <strong>Arom Log</strong> เป็นโปรเจกต์ที่พัฒนาขึ้นด้วยใจเพื่อช่วยดูแลสุขภาพใจของทุกคน การสนับสนุนของคุณช่วยเป็นค่าน้ำ ค่าไฟ และค่า Server ให้ระบบดำเนินต่อไปได้ครับ 💛
          </p>
        </div>

        {/* Support Card: Buy Me a Coffee */}
        <div className="bg-white/90 rounded-2xl p-4 border border-amber-200/70 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 text-lg shadow-2xs font-bold">
                ☕
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-stone-900 leading-tight">
                  Zberus Studio
                </h4>
                <span className="text-[11px] font-mono text-stone-400">
                  buymeacoffee.com/zberus_studio
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className={`p-2 rounded-xl border transition cursor-pointer flex items-center gap-1 text-xs font-bold ${
                copied
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-600'
              }`}
              title="คัดลอกลิงก์"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px]">คัดลอกแล้ว</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-500" />
                  <span className="text-[10px]">คัดลอก</span>
                </>
              )}
            </button>
          </div>

          {/* Primary Action Button */}
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 active:scale-98 text-stone-950 font-black text-sm sm:text-base transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Coffee className="w-4 h-4 fill-current text-stone-950" />
            <span>ไปที่หน้า Buy Me a Coffee</span>
            <ExternalLink className="w-4 h-4 text-stone-900/80 ml-0.5" />
          </a>
        </div>

        {/* Warm Thank You Note */}
        <div className="pt-1 border-t border-amber-200/50 text-[11px] text-stone-500 flex items-center justify-center gap-1">
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline shrink-0" />
          <span>ทุกการสนับสนุนและการใช้งานของคุณมีความหมายกับเรามากครับ ขอบคุณครับ!</span>
        </div>
      </div>
    </div>
  );
};

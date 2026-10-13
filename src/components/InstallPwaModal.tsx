import React from 'react';
import { Smartphone, Download, X, ExternalLink, Sparkles, CheckCircle2 } from 'lucide-react';

interface InstallPwaModalProps {
  deferredPrompt: any | null;
  onClose: () => void;
  onInstallSuccess?: () => void;
}

export const InstallPwaModal: React.FC<InstallPwaModalProps> = ({
  deferredPrompt,
  onClose,
  onInstallSuccess,
}) => {
  const handleTriggerInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          if (onInstallSuccess) onInstallSuccess();
          onClose();
        }
      } catch (err) {
        console.error('PWA install prompt error:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 space-y-5 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with App Icon */}
        <div className="text-center space-y-2 pt-2">
          <img
            src="/arom-icon.png"
            alt="Arom Log Logo"
            className="w-16 h-16 mx-auto object-contain"
          />
          <h3 className="text-lg font-black text-gray-900 flex items-center justify-center gap-1.5">
            <span>ติดตั้ง Arom Log บนมือถือ</span>
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
          </h3>
          <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
            สร้างทางลัดไว้บนหน้าจอหลัก เปิดใช้งานได้ทันที เต็มจอ ลื่นไหล ไม่ต้องเปิดแถบ URL บราวเซอร์
          </p>
        </div>

        {/* If Chrome prompt is ready, show One-Click Install Button */}
        {deferredPrompt && (
          <button
            type="button"
            onClick={handleTriggerInstall}
            className="w-full py-3.5 px-4 bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>กดติดตั้งลงเครื่องทันที</span>
          </button>
        )}

        {/* Step-by-Step Guide for Chrome Mobile */}
        <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200/60 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
            <Smartphone className="w-4 h-4 text-amber-600" />
            <span>วิธีสร้างทางลัดบน Google Chrome (Android / Mobile):</span>
          </div>

          <ol className="text-xs text-gray-700 space-y-2.5 pl-1">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <span>
                แตะที่ปุ่ม <strong>จุด 3 จุด (⋮)</strong> บริเวณมุมขวาบนของหน้าต่าง Chrome
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <span>
                เลือกเมนู <strong>&ldquo;ติดตั้งแอป&rdquo; (Install app)</strong> หรือ <strong>&ldquo;เพิ่มลงในหน้าจอหลัก&rdquo; (Add to Home screen)</strong>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <span>
                กดยืนยัน <strong>&ldquo;ติดตั้ง&rdquo; (Install)</strong> — ไอคอนแอปจะไปอยู่ที่หน้าจอหลักทันที!
              </span>
            </li>
          </ol>
        </div>

        {/* Benefits list */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600">
          <div className="flex items-center gap-1.5 bg-gray-50 p-2 rounded-xl">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>เปิดเต็มจอไม่มี URL bar</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-50 p-2 rounded-xl">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>แตะเข้าบันทึกได้รวดเร็ว</span>
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 text-xs text-gray-500 hover:text-gray-800 font-semibold transition cursor-pointer"
        >
          เข้าใจแล้ว / ปิดหน้าต่างนี้
        </button>
      </div>
    </div>
  );
};

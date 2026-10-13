import React, { useState } from 'react';
import { loginWithGoogle } from '../firebase.ts';
import { Sparkles, Heart, ShieldCheck, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('หน้าต่างเข้าสู่ระบบถูกปิดก่อนทำรายการเสร็จสิ้น');
      } else {
        setErrorMsg(err.message || 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้ในขณะนี้');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-amber-50/60 via-orange-50/30 to-sky-50/50 flex flex-col justify-center items-center px-3 sm:px-4 py-6 sm:py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-5 sm:p-8 shadow-xl border border-amber-100 space-y-5 sm:space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <img
            src="/arom-icon.png"
            alt="Arom Log Logo"
            className="w-16 h-16 mx-auto object-contain"
          />
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Arom Log
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
              บันทึกอารมณ์ในขวดโหล
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              ดูแลสุขภาพจิตใจของคุณทุกวันผ่านลูกแก้วอารมณ์และปฏิทินความสุข
            </p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-2.5 bg-amber-50/40 p-4 rounded-2xl border border-amber-100 text-xs text-gray-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>เข้าสู่ระบบด้วย Google บัญชีเดียว ปลอดภัยด้วย Firebase Auth</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>วาดหน้าตาอารมณ์ของตัวเองผ่าน HTML5 Canvas ได้อย่างอิสระ</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>โหลอารมณ์ฟิสิกส์ 2D เด้งดึ๋ง (Physics Jar)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>วิเคราะห์กิจกรรมที่มักเกิดคู่กับความสุขหรือความเครียด</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* FR1.1 Google Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full py-3.5 px-4 rounded-2xl border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-800 font-bold text-sm shadow-xs hover:shadow-md active:scale-98 transition flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
              <span>กำลังเชื่อมต่อกับ Google...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>เข้าสู่ระบบด้วย Google (Google Login)</span>
            </>
          )}
        </button>

        {/* Security Rules guarantee badge */}
        <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>ข้อมูลของคุณถูกปกป้องด้วย Firebase Security Rules (เข้าถึงได้เฉพาะคุณ)</span>
        </div>
      </div>
    </div>
  );
};

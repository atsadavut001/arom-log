import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase.ts';
import { TodoItem, isTodoDoneOn, getTodayThai } from '../types.ts';
import { ArrowLeft, BarChart3, CheckCircle2, Circle, Repeat } from 'lucide-react';

interface TodoStatsViewProps {
  currentUser: User;
  onBack: () => void;
}

const monthDays = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) =>
    `${ym}-${String(i + 1).padStart(2, '0')}`
  );
};

export const TodoStatsView: React.FC<TodoStatsViewProps> = ({ currentUser, onBack }) => {
  const todayStr = getTodayThai();
  const [selectedMonth, setSelectedMonth] = useState<string>(todayStr.substring(0, 7));
  const [todos, setTodos] = useState<TodoItem[]>([]);

  useEffect(() => {
    const colRef = collection(db, 'users', currentUser.uid, 'todos');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const items: TodoItem[] = [];
        snapshot.forEach((d) => items.push(d.data() as TodoItem));
        setTodos(items);
      },
      (err) => console.error('Todo stats listener error:', err)
    );
    return () => unsubscribe();
  }, [currentUser.uid]);

  const stats = useMemo(() => {
    const days = monthDays(selectedMonth).filter((d) => d <= todayStr);
    // Count how many scheduled tasks existed on each day and how many were done
    let scheduled = 0;
    let done = 0;
    const perTask = todos
      .filter((t) => t.date.startsWith(selectedMonth) || t.scope === 'daily')
      .map((t) => {
        const applicable = days.filter((d) =>
          t.scope === 'daily' ? d >= t.date : d === t.date
        );
        const doneCount = applicable.filter((d) => isTodoDoneOn(t, d)).length;
        scheduled += applicable.length;
        done += doneCount;
        return { item: t, total: applicable.length, doneCount };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.doneCount - a.doneCount);

    const rate = scheduled > 0 ? Math.round((done / scheduled) * 100) : 0;
    return { scheduled, done, rate, perTask };
  }, [todos, selectedMonth, todayStr]);

  const [year, month] = selectedMonth.split('-').map(Number);
  const shiftMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100 max-w-3xl mx-auto space-y-6">
      <div className="pb-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mt-2 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-500" />
            สถิติ To Do List
          </h2>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">ดูว่าทำแผนสำเร็จไปแล้วกี่ครั้งในแต่ละเดือน</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="px-2.5 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold cursor-pointer"
          >
            ‹
          </button>
          <span className="text-xs font-bold text-gray-800 min-w-[90px] text-center">{selectedMonth}</span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="px-2.5 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold cursor-pointer"
          >
            ›
          </button>
          <button
            type="button"
            onClick={onBack}
            className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            กลับไปแผนประจำวัน
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-2xl bg-teal-50/70 border border-teal-200">
          <span className="text-[10px] sm:text-xs font-bold text-teal-800 uppercase tracking-wider">ทำสำเร็จ</span>
          <div className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{stats.done}</div>
        </div>
        <div className="p-3 sm:p-4 rounded-2xl bg-green-50/70 border border-green-200">
          <span className="text-[10px] sm:text-xs font-bold text-green-800 uppercase tracking-wider">ทั้งหมดที่กำหนด</span>
          <div className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{stats.scheduled}</div>
        </div>
        <div className="p-3 sm:p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
          <span className="text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">อัตราสำเร็จ</span>
          <div className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{stats.rate}%</div>
        </div>
      </div>

      {stats.perTask.length === 0 ? (
        <div className="text-center py-10 px-4 bg-gray-50 rounded-3xl border border-gray-200/80">
          <p className="text-sm font-bold text-gray-700">ยังไม่มีข้อมูลในเดือนนี้</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {stats.perTask.map(({ item, total, doneCount }) => (
            <li key={item.id} className="p-3 rounded-2xl border border-gray-200 bg-white space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-gray-800 truncate flex items-center gap-1.5">
                  {item.scope === 'daily' ? (
                    <Repeat className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                  ) : doneCount === total ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  )}
                  {item.plan}
                </span>
                <span className="text-xs text-gray-500 shrink-0">
                  {doneCount}/{total} ({total > 0 ? Math.round((doneCount / total) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${total > 0 ? (doneCount / total) * 100 : 0}%` }}
                  className="h-full bg-green-500 transition-all duration-500"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase.ts';
import { TodoItem, isTodoDoneOn, getTodayThai } from '../types.ts';
import { ListChecks, Plus, Trash2, Clock, BarChart3, X, Check } from 'lucide-react';

interface TodoViewProps {
  currentUser: User;
  onOpenStats: () => void;
}

export const TodoView: React.FC<TodoViewProps> = ({ currentUser, onOpenStats }) => {
  const todayStr = getTodayThai();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [plan, setPlan] = useState('');
  const [scope, setScope] = useState<'daily' | 'today'>('today');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const colRef = collection(db, 'users', currentUser.uid, 'todos');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const items: TodoItem[] = [];
        snapshot.forEach((d) => items.push(d.data() as TodoItem));
        setTodos(items);
      },
      (err) => console.error('Todo listener error:', err)
    );
    return () => unsubscribe();
  }, [currentUser.uid]);

  // Show daily tasks every day, and one-off tasks only on the day they were created
  const visibleTodos = todos
    .filter((t) => t.scope === 'daily' || t.date === todayStr)
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = plan.trim();
    if (!trimmed) {
      setError('กรุณากรอกแผนวันนี้');
      return;
    }
    setError('');
    const id = `todo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const nowIso = new Date().toISOString();
    const item: TodoItem = {
      id,
      userId: currentUser.uid,
      plan: trimmed,
      scope,
      date: todayStr,
      completedDates: [],
      createdAt: nowIso,
      updatedAt: nowIso,
      ...(time ? { time } : {}),
    };
    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'todos', id), item);
      setPlan('');
      setTime('');
      setScope('today');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Add todo error:', err);
      setError('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleToggle = async (item: TodoItem) => {
    const done = isTodoDoneOn(item, todayStr);
    const completedDates = done
      ? item.completedDates.filter((d) => d !== todayStr)
      : [...item.completedDates, todayStr];
    try {
      await setDoc(
        doc(db, 'users', currentUser.uid, 'todos', item.id),
        { completedDates, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (err) {
      console.error('Toggle todo error:', err);
    }
  };

  const handleDelete = async (item: TodoItem) => {
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'todos', item.id));
    } catch (err) {
      console.error('Delete todo error:', err);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100 max-w-3xl mx-auto space-y-6">
      <div className="pb-4 border-b border-gray-100 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mt-2">แผนประจำวัน</h2>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">วางแผนสิ่งที่อยากทำ แล้วติ๊กเมื่อทำเสร็จ</p>
        </div>
        <button
          type="button"
          onClick={onOpenStats}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-bold transition cursor-pointer"
        >
          <BarChart3 className="w-4 h-4" />
          สถิติ To Do
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          setError('');
          setIsModalOpen(true);
        }}
        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        เพิ่มรายการ
      </button>

      {visibleTodos.length === 0 ? (
        <div className="text-center py-10 px-4 bg-gray-50 rounded-3xl border border-gray-200/80">
          <ListChecks className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-700">ยังไม่มีแผนสำหรับวันนี้</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visibleTodos.map((item) => {
            const done = isTodoDoneOn(item, todayStr);
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-2xl border border-gray-200 bg-white shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => handleToggle(item)}
                  className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition cursor-pointer ${
                    done ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 hover:border-green-500'
                  }`}
                  aria-label="ทำแล้ว"
                  aria-pressed={done}
                >
                  {done && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {item.plan}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                    {item.time && (
                      <span className="inline-flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {item.time}
                      </span>
                    )}
                    <span>{item.scope === 'daily' ? 'ทุกวัน' : 'วันนี้'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                  title="ลบรายการ"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {isModalOpen && (
        <div
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4"
        >
          <form
            onSubmit={handleAdd}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-green-600" />
                เพิ่มรายการแผนประจำวัน
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition cursor-pointer"
                title="ปิด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">แผนวันนี้</label>
              <input
                type="text"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                maxLength={300}
                placeholder="เช่น อ่านหนังสือ 30 นาที"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">ความถี่</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as 'daily' | 'today')}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
                >
                  <option value="today">วันนี้</option>
                  <option value="daily">ทุกวัน</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">เวลา (ไม่บังคับ)</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                บันทึก
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

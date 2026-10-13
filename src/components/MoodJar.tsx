import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { MoodEntry, MOOD_PRESETS } from '../types.ts';
import {
  Sparkles,
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Info,
  Heart
} from 'lucide-react';

interface MoodJarProps {
  entries: MoodEntry[];
  selectedMonth: string; // YYYY-MM
  onMonthChange: (month: string) => void;
  onSelectEntry?: (entry: MoodEntry) => void;
}

export const MoodJar: React.FC<MoodJarProps> = ({
  entries,
  selectedMonth,
  onMonthChange,
  onSelectEntry,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const orbsMapRef = useRef<Map<number, MoodEntry>>(new Map());

  const [hoveredEntry, setHoveredEntry] = useState<MoodEntry | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  // Filter entries for the selected month
  const monthEntries = entries.filter((e) => e.date.startsWith(selectedMonth));

  // Count by mood type
  const moodCounts = monthEntries.reduce((acc, curr) => {
    acc[curr.moodType] = (acc[curr.moodType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    const newMonthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(newMonthStr);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month, 1);
    const newMonthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(newMonthStr);
  };

  // Format month for display in Thai
  const formatMonthThai = (ym: string) => {
    const [year, month] = ym.split('-').map(Number);
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return `${thaiMonths[month - 1]} ${year + 543}`;
  };

  // Initialize or re-create Matter.js physics simulation
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const {
      Engine,
      Render,
      Runner,
      Bodies,
      Composite,
      Mouse,
      MouseConstraint,
      Body,
      Events,
    } = Matter;

    // Clean up previous instance
    if (runnerRef.current) Runner.stop(runnerRef.current);
    if (renderRef.current) {
      Render.stop(renderRef.current);
      if (renderRef.current.canvas) {
        renderRef.current.canvas.remove();
      }
    }
    if (engineRef.current) {
      Composite.clear(engineRef.current.world, false);
      Engine.clear(engineRef.current);
    }
    orbsMapRef.current.clear();

    const width = 360;
    const height = 440;

    const engine = Engine.create({
      gravity: { x: 0, y: 1.1, scale: 0.001 },
    });
    engineRef.current = engine;

    const render = Render.create({
      canvas: canvasRef.current,
      engine: engine,
      options: {
        width: width,
        height: height,
        wireframes: false,
        background: 'transparent',
      },
    });
    renderRef.current = render;

    // Build the Jar's boundaries
    // Jar inner width ~ 280, height ~ 320, centered
    const jarLeft = 35;
    const jarRight = width - 35;
    const jarBottom = height - 25;
    const jarTop = 75;
    const wallThickness = 40;

    const ground = Bodies.rectangle(width / 2, jarBottom + wallThickness / 2, width, wallThickness, {
      isStatic: true,
      render: { visible: false },
    });

    const leftWall = Bodies.rectangle(jarLeft - wallThickness / 2, height / 2, wallThickness, height, {
      isStatic: true,
      render: { visible: false },
    });

    const rightWall = Bodies.rectangle(jarRight + wallThickness / 2, height / 2, wallThickness, height, {
      isStatic: true,
      render: { visible: false },
    });

    const ceiling = Bodies.rectangle(width / 2, jarTop - wallThickness / 2, width, wallThickness, {
      isStatic: true,
      render: { visible: false },
    });

    Composite.add(engine.world, [ground, leftWall, rightWall, ceiling]);

    // Create mood balls (orbs)
    const orbRadius = monthEntries.length > 20 ? 19 : monthEntries.length > 10 ? 22 : 25;
    const bodies: Matter.Body[] = [];

    monthEntries.forEach((entry, idx) => {
      // Spawn at top with slight staggered horizontal offset
      const startX = jarLeft + 30 + ((idx * 37) % (jarRight - jarLeft - 60));
      const startY = jarTop + 20 + ((idx * 15) % 100);

      const orb = Bodies.circle(startX, startY, orbRadius, {
        restitution: 0.6, // bouncy!
        friction: 0.1,
        frictionAir: 0.015,
        density: 0.002,
        render: {
          fillStyle: entry.moodColor || '#F59E0B',
          strokeStyle: '#FFFFFF',
          lineWidth: 3,
        },
      });

      // Save custom reference to entry
      (orb as any).moodEntry = entry;
      orbsMapRef.current.set(orb.id, entry);
      bodies.push(orb);
    });

    Composite.add(engine.world, bodies);

    // Mouse control for interactivity
    const mouse = Mouse.create(render.canvas);
    // Allow touch scrolling if not grabbing orb
    mouse.element.removeEventListener('mousewheel', (mouse as any).mousewheel);
    mouse.element.removeEventListener('DOMMouseScroll', (mouse as any).mousewheel);

    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false },
      },
    });

    Composite.add(engine.world, mouseConstraint);
    render.mouse = mouse;

    // Detect click / hover on orbs
    Events.on(mouseConstraint, 'mousedown', (event) => {
      const mousePosition = event.mouse.position;
      const clickedBody = Matter.Query.point(bodies, mousePosition)[0];
      if (clickedBody && (clickedBody as any).moodEntry) {
        setHoveredEntry((clickedBody as any).moodEntry);
        if (onSelectEntry) {
          onSelectEntry((clickedBody as any).moodEntry);
        }
      }
    });

    // Custom rendering of emoji or custom drawing onto canvas over the bodies
    Events.on(render, 'afterRender', () => {
      const ctx = render.context;
      if (!ctx) return;

      bodies.forEach((orb) => {
        const entry = (orb as any).moodEntry as MoodEntry;
        if (!entry) return;

        const { x, y } = orb.position;
        const angle = orb.angle;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Find preset emoji
        const preset = MOOD_PRESETS.find((p) => p.type === entry.moodType);
        const emoji = preset ? preset.emoji : '✨';

        ctx.font = `${orbRadius * 1.05}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 0, 1);

        ctx.restore();
      });
    });

    const runner = Runner.create();
    runnerRef.current = runner;
    Runner.run(runner, engine);
    Render.run(render);

    return () => {
      Runner.stop(runner);
      Render.stop(render);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
    };
  }, [selectedMonth, monthEntries.length]);

  // Shake Jar function: applies randomized impulses to all orbs
  const handleShakeJar = () => {
    if (!engineRef.current || monthEntries.length === 0) return;
    setIsShaking(true);

    const bodies = Matter.Composite.allBodies(engineRef.current.world).filter(
      (b: Matter.Body) => !b.isStatic
    );

    bodies.forEach((orb: Matter.Body) => {
      const forceX = (Math.random() - 0.5) * 0.08;
      const forceY = -0.05 - Math.random() * 0.08; // upward burst
      Matter.Body.applyForce(orb, orb.position, { x: forceX, y: forceY });
    });

    setTimeout(() => setIsShaking(false), 800);
  };

  return (
    <div className="bg-white rounded-3xl p-5 md:p-8 shadow-sm border border-gray-100 max-w-4xl mx-auto">
      {/* Header and Month Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200">
            <Heart className="w-3.5 h-3.5 text-pink-500" />
            Physics Mood Jar (FR3.2)
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mt-2">
            โหลแก้วเก็บอารมณ์
          </h2>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            รวบรวมลูกแก้วความรู้สึกของแต่ละวันในเดือนมาใส่ในโหล กลิ้งและเด้งดึ๋งด้วย Physics Engine
          </p>
        </div>

        {/* Month selector navigation */}
        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-white text-gray-700 rounded-xl transition"
            title="เดือนก่อนหน้า"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-3 text-xs md:text-sm font-bold text-gray-800 flex items-center gap-1.5 min-w-[130px] justify-center">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            {formatMonthThai(selectedMonth)}
          </div>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-white text-gray-700 rounded-xl transition"
            title="เดือนถัดไป"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Jar Visual Area */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* Left: Glass Jar Canvas */}
        <div className="md:col-span-7 flex flex-col items-center w-full overflow-hidden">
          <div
            ref={containerRef}
            className={`relative w-[290px] xs:w-[320px] sm:w-[360px] h-[400px] sm:h-[450px] flex items-center justify-center transition-transform ${
              isShaking ? 'animate-bounce' : ''
            }`}
          >
            {/* Glass Jar Outer SVG Aesthetic Frame */}
            <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center">
              {/* Cork Lid */}
              <div className="w-36 sm:w-44 h-7 sm:h-8 bg-linear-to-b from-amber-700 to-amber-900 rounded-t-xl shadow-md border-b-2 border-amber-950/40 relative">
                <div className="absolute inset-x-2 top-1 h-1 bg-amber-600/60 rounded-full" />
              </div>
              {/* Jar Neck */}
              <div className="w-44 sm:w-52 h-3.5 sm:h-4 bg-white/20 border-x-2 border-white/60 backdrop-blur-xs" />
              {/* Jar Body Glass Container with reflection gradients */}
              <div className="w-[260px] xs:w-[285px] sm:w-[310px] h-[320px] sm:h-[360px] rounded-b-[40px] sm:rounded-b-[45px] rounded-t-[18px] sm:rounded-t-[20px] border-4 border-white/80 bg-linear-to-b from-white/30 via-sky-50/20 to-sky-100/30 backdrop-blur-xs shadow-xl relative overflow-hidden">
                {/* Glass light reflection highlights */}
                <div className="absolute top-4 left-3 sm:left-4 w-2.5 sm:w-3.5 h-64 sm:h-72 bg-linear-to-b from-white/80 via-white/40 to-transparent rounded-full filter blur-[1px]" />
                <div className="absolute top-8 right-3 sm:right-5 w-1.5 sm:w-2 h-40 sm:h-48 bg-linear-to-b from-white/60 to-transparent rounded-full filter blur-[1px]" />
                {/* Bottom glass thickness curve */}
                <div className="absolute bottom-0 inset-x-0 h-6 sm:h-7 bg-linear-to-t from-white/70 to-transparent rounded-b-[36px] sm:rounded-b-[40px]" />
              </div>
            </div>

            {/* Canvas for Matter.js Physics */}
            <canvas
              ref={canvasRef}
              className="relative z-0 rounded-b-[40px] sm:rounded-b-[45px] cursor-grab active:cursor-grabbing select-none max-w-full h-auto"
            />
          </div>

          {/* Action buttons under jar */}
          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={handleShakeJar}
              disabled={monthEntries.length === 0}
              className="px-5 py-2.5 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs md:text-sm flex items-center gap-2 shadow-xs hover:shadow-md transition active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isShaking ? 'animate-spin' : ''}`} />
              เขย่าโหลอารมณ์ (Shake Jar)
            </button>
            <span className="text-xs text-gray-400">
              แตะหรือลากลูกแก้วเพื่อดูรายละเอียด
            </span>
          </div>
        </div>

        {/* Right: Jar Stats & Inspector */}
        <div className="md:col-span-5 space-y-5">
          {/* Jar Capacity / Summary */}
          <div className="bg-linear-to-br from-amber-50 to-orange-50/50 border border-amber-200/80 rounded-3xl p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                สถิติในโหลประจำเดือน
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-200/80 text-amber-950">
                {monthEntries.length} ลูกแก้ว
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-gray-900">
                {monthEntries.length}
              </span>
              <span className="text-xs text-gray-600 font-medium">
                วันที่มีการบันทึกอารมณ์ในเดือนนี้
              </span>
            </div>

            {/* Mood Category Breakdown Pills */}
            <div className="mt-4 pt-4 border-t border-amber-200/60 grid grid-cols-2 gap-2">
              {MOOD_PRESETS.filter((p) => (moodCounts[p.type] || 0) > 0).map((preset) => {
                const count = moodCounts[preset.type] || 0;
                return (
                  <div
                    key={preset.type}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/80 border border-amber-200/50 shadow-2xs text-xs"
                  >
                    <span className="flex items-center gap-1.5 font-medium text-gray-800">
                      <span>{preset.emoji}</span>
                      <span>{preset.label}</span>
                    </span>
                    <span className="font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded-lg text-[11px]">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Orb Inspector Detail View when clicked/hovered */}
          {hoveredEntry ? (
            <div className="bg-white border-2 border-amber-300 rounded-3xl p-5 shadow-sm space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  วันที่ {hoveredEntry.date}
                </span>
                <span
                  style={{ backgroundColor: hoveredEntry.moodColor }}
                  className="w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-xs"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="text-3xl">
                  {hoveredEntry.customDrawing ? (
                    <img
                      src={hoveredEntry.customDrawing}
                      alt="Face"
                      className="w-10 h-10 rounded-full border border-amber-300 object-cover"
                    />
                  ) : (
                    MOOD_PRESETS.find((p) => p.type === hoveredEntry.moodType)?.emoji || '✨'
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">
                    {hoveredEntry.moodLabel}
                  </h4>
                  <p className="text-xs text-gray-500">
                    คะแนนความรู้สึก: {hoveredEntry.moodScore}{hoveredEntry.moodScore > 5 ? ' / 10' : ` / 10 (${hoveredEntry.moodScore}/5)`}
                  </p>
                </div>
              </div>

              {hoveredEntry.note && (
                <div className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl italic border border-gray-100">
                  "{hoveredEntry.note}"
                </div>
              )}

              {hoveredEntry.tags && hoveredEntry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {hoveredEntry.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-3xl bg-gray-50 border border-gray-200/80 text-center text-xs text-gray-500 space-y-1">
              <Info className="w-5 h-5 text-gray-400 mx-auto" />
              <p className="font-medium text-gray-700">คลิกลูกแก้วในขวดโหล</p>
              <p>เพื่อตรวจดูบันทึกและเรื่องราวของวันนั้นๆ</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

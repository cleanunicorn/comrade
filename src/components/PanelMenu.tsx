import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  title?: string;
}

export function PanelMenu({ children, title = "Panel options" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={title}
        aria-label={title}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center bg-transparent p-0.5 leading-none cursor-pointer border-0 outline-none transition-transform hover:scale-110"
      >
        <SliderKnobsIcon active={open} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 flex min-w-[180px] flex-col gap-2 rounded-sm border border-[rgba(0,240,255,0.40)] bg-[rgba(7,0,15,0.96)] p-2 shadow-[0_0_18px_rgba(0,240,255,0.30)] backdrop-blur">
          {children}
        </div>
      )}
    </div>
  );
}

function SliderKnobsIcon({ active }: { active: boolean }) {
  const stroke = "#00f0ff";
  const dot = active ? "#ffe53b" : "#ff2079";
  const glow = active
    ? "drop-shadow(0 0 4px #ffe53b) drop-shadow(0 0 3px #00f0ff)"
    : "drop-shadow(0 0 4px #ff2079) drop-shadow(0 0 3px #00f0ff)";
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      style={{ filter: glow, display: "block" }}
      aria-hidden
    >
      <polygon
        points="7,1.2 12.2,4.2 12.2,9.8 7,12.8 1.8,9.8 1.8,4.2"
        stroke={stroke}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="7" r="1.6" fill={dot} />
    </svg>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="sw-accent text-[10px] text-[var(--sw-text-dim)]">{label}</span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

interface Props {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}

export function FontSizer({ value, onChange, min = 10, max = 28 }: Props) {
  const v = Math.min(max, Math.max(min, value));
  const set = (n: number) => onChange(Math.min(max, Math.max(min, n)));

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => set(v - 1)}
        disabled={v <= min}
        title="Decrease font size"
        className="rounded border border-neutral-700 px-1.5 py-0.5 text-[10px] leading-none text-neutral-300 hover:bg-neutral-800 disabled:opacity-40"
      >
        −
      </button>
      <span className="w-5 text-center text-[10px] tabular-nums text-neutral-500">{v}</span>
      <button
        type="button"
        onClick={() => set(v + 1)}
        disabled={v >= max}
        title="Increase font size"
        className="rounded border border-neutral-700 px-1.5 py-0.5 text-[10px] leading-none text-neutral-300 hover:bg-neutral-800 disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

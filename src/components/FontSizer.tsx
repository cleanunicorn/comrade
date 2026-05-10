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
        className="btn btn-ghost btn-sm leading-none"
      >
        −
      </button>
      <span className="sw-num w-5 text-center text-[11px] text-[var(--sw-cyan)]">{v}</span>
      <button
        type="button"
        onClick={() => set(v + 1)}
        disabled={v >= max}
        title="Increase font size"
        className="btn btn-ghost btn-sm leading-none"
      >
        +
      </button>
    </div>
  );
}

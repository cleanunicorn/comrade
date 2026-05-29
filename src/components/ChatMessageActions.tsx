import { useState } from "react";

const TIMEOUT_PRESETS: Array<{ label: string; sec: number }> = [
  { label: "1m", sec: 60 },
  { label: "10m", sec: 600 },
  { label: "1h", sec: 3600 },
  { label: "24h", sec: 86400 },
  { label: "7d", sec: 604800 },
];

interface Props {
  username: string;
  onDelete: () => void;
  onTimeout: (sec: number) => void;
  onBan: (reason?: string) => void;
  onBlock: () => void;
}

export function ChatMessageActions({ username, onDelete, onTimeout, onBan, onBlock }: Props) {
  const [openMenu, setOpenMenu] = useState<null | "timeout" | "ban" | "block">(null);
  const [banReason, setBanReason] = useState("");

  function close() {
    setOpenMenu(null);
    setBanReason("");
  }

  return (
    <div
      className={`relative ml-2 shrink-0 items-center gap-1 ${
        openMenu ? "flex" : "hidden group-hover:flex"
      }`}
    >
      <IconBtn label="Delete message" onClick={onDelete}>
        <TrashIcon />
      </IconBtn>

      <div className="relative flex items-center">
        <button
          type="button"
          title="Timeout 10m"
          onClick={() => onTimeout(600)}
          className="rounded p-1 text-[var(--sw-text-dim)] hover:bg-[rgba(255,32,121,0.20)] hover:text-white"
        >
          <ClockIcon />
        </button>
        <button
          type="button"
          aria-label="Timeout duration"
          onClick={() => setOpenMenu(openMenu === "timeout" ? null : "timeout")}
          className="rounded px-0.5 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-100"
        >
          ▾
        </button>
        {openMenu === "timeout" && (
          <div className="absolute right-0 top-full z-10 mt-1 flex flex-col rounded-sm border border-[rgba(0,240,255,0.35)] bg-[rgba(7,0,15,0.95)] backdrop-blur text-xs shadow-lg">
            {TIMEOUT_PRESETS.map((p) => (
              <button
                key={p.sec}
                type="button"
                onClick={() => {
                  onTimeout(p.sec);
                  close();
                }}
                className="px-3 py-1 text-left text-[var(--sw-text)] hover:bg-[rgba(255,32,121,0.20)]"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <IconBtn label="Ban permanently" onClick={() => setOpenMenu("ban")}>
        <BanIcon />
      </IconBtn>

      <IconBtn label="Block on Twitch" onClick={() => setOpenMenu("block")}>
        <BlockIcon />
      </IconBtn>

      {openMenu === "ban" && (
        <ConfirmPopover
          title={`Ban @${username} permanently?`}
          extra={
            <input
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Reason (optional)"
              className="sw-input w-full text-xs"
            />
          }
          onCancel={close}
          onConfirm={() => {
            onBan(banReason.trim() || undefined);
            close();
          }}
        />
      )}

      {openMenu === "block" && (
        <ConfirmPopover
          title={`Block @${username} across Twitch?`}
          onCancel={close}
          onConfirm={() => {
            onBlock();
            close();
          }}
        />
      )}
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="rounded p-1 text-[var(--sw-text-dim)] hover:bg-[rgba(255,32,121,0.20)] hover:text-white"
    >
      {children}
    </button>
  );
}

function ConfirmPopover({
  title,
  extra,
  onCancel,
  onConfirm,
}: {
  title: string;
  extra?: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-sm border border-[rgba(0,240,255,0.35)] bg-[rgba(7,0,15,0.95)] backdrop-blur p-3 shadow-lg">
      <div className="mb-2 sw-mono text-xs text-[var(--sw-text)]">{title}</div>
      {extra && <div className="mb-2">{extra}</div>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm">
          Cancel
        </button>
        <button type="button" onClick={onConfirm} className="btn btn-danger btn-sm">
          Confirm
        </button>
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function BanIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}

function BlockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="17" y1="8" x2="23" y2="14" />
      <line x1="23" y1="8" x2="17" y2="14" />
    </svg>
  );
}

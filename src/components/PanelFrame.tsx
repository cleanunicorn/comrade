import type { ReactNode } from "react";

interface Props {
  title: string;
  menu?: ReactNode;
  controls?: ReactNode;
  children: ReactNode;
  flush?: boolean;
  bodyClass?: string;
}

export function PanelFrame({ title, menu, controls, children, flush, bodyClass }: Props) {
  return (
    <div className="panel">
      <div className="panel-handle">
        <span className="grip" aria-hidden>
          <i /><i /><i /><i /><i /><i />
        </span>
        {menu && (
          <div
            className="flex items-center"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {menu}
          </div>
        )}
        <span className="panel-title">{title}</span>
        {controls && (
          <div
            className="flex flex-wrap items-center gap-1.5"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {controls}
          </div>
        )}
      </div>
      <div className={`panel-body${flush ? " flush" : ""}${bodyClass ? " " + bodyClass : ""}`}>
        {children}
      </div>
    </div>
  );
}

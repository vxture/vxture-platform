import type { ReactNode } from "react";

export interface SummaryStripItem {
  label: string;
  value: string;
  hint?: string;
  aside?: ReactNode;
}

export function SummaryStrip({ items }: { items: SummaryStripItem[] }) {
  return (
    <div className="vx-summary-strip">
      {items.map((item) => (
        <div key={item.label} className="vx-summary-strip__item">
          <div className="vx-summary-strip__top">
            <span>{item.label}</span>
            {item.aside ? (
              <div className="vx-summary-strip__aside">{item.aside}</div>
            ) : null}
          </div>
          <strong>{item.value}</strong>
          {item.hint ? <p>{item.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

import type { ReactNode } from "react";

export interface SignalListItem {
  title: string;
  description?: string;
  aside?: ReactNode;
}

export function SignalList({ items }: { items: SignalListItem[] }) {
  return (
    <div className="vx-signal-list">
      {items.map((item) => (
        <div key={item.title} className="vx-signal-list__item">
          <div>
            <strong>{item.title}</strong>
            {item.description ? <p>{item.description}</p> : null}
          </div>
          {item.aside ? item.aside : null}
        </div>
      ))}
    </div>
  );
}

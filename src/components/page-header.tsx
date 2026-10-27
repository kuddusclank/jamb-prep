import type { ReactNode } from "react";

export interface PageHeaderProps {
  badge?: {
    icon?: ReactNode;
    text: string;
    variant?: "emerald" | "amber" | "blue";
  };
  extraTag?: string; // e.g. "2027 UTME"
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  badge,
  extraTag,
  title,
  subtitle,
  actions,
  className = "",
}: PageHeaderProps) {
  const badgeClasses =
    badge?.variant === "amber"
      ? "bg-amber-50 text-amber-900 border border-amber-200"
      : badge?.variant === "blue"
      ? "bg-blue-50 text-blue-900 border border-blue-200"
      : "bg-emerald-50 text-[#116149] border border-emerald-200";

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6 mb-8 ${className}`}
    >
      <div>
        {badge && (
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${badgeClasses}`}
            >
              {badge.icon}
              <span>{badge.text}</span>
            </span>
            {extraTag && (
              <span className="text-xs text-slate-400 font-medium">{extraTag}</span>
            )}
          </div>
        )}
        <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-[#092E28]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-600 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  );
}

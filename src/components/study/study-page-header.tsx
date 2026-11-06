"use client";

import React, { ReactNode } from "react";

interface StudyPageHeaderProps {
  badge?: string;
  badgeIcon?: ReactNode;
  title: string;
  subtitle: string;
  rightElement?: ReactNode;
  breadcrumbs?: ReactNode;
}

export function StudyPageHeader({
  badge,
  badgeIcon,
  title,
  subtitle,
  rightElement,
  breadcrumbs,
}: StudyPageHeaderProps) {
  return (
    <div className="space-y-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
      {breadcrumbs && <div className="text-xs sm:text-sm text-zinc-500">{breadcrumbs}</div>}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          {badge && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 w-fit">
              {badgeIcon}
              <span>{badge}</span>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#092E28] dark:text-zinc-100 tracking-tight">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed">
            {subtitle}
          </p>
        </div>

        {rightElement && (
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}

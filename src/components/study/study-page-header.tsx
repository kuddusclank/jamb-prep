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
    <div className="space-y-4 pb-6 border-b border-slate-200 mb-6">
      {breadcrumbs && <div className="text-xs sm:text-sm text-slate-500">{breadcrumbs}</div>}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          {badge && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#116149] border border-emerald-200 w-fit">
              {badgeIcon}
              <span>{badge}</span>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#092E28] tracking-tight">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
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

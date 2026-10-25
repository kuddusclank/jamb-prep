import styles from "@/components/study-skeleton.module.css";

export function SchoolDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#F7F8F6] text-[#17231F] animate-in fade-in duration-200">
      {/* Header skeleton */}
      <header className="border-b border-[#E3E8E4] bg-white sticky top-0 z-30">
        <div className="shell flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`${styles.block} size-8 rounded-lg`} />
            <div className={`${styles.block} h-5 w-24 rounded`} />
            <div className="h-4 w-px bg-[#E3E8E4]" />
            <div className={`${styles.block} h-4 w-32 rounded`} />
            <div className={`${styles.block} h-5 w-24 rounded-full`} />
          </div>
          <div className="flex items-center gap-3">
            <div className={`${styles.block} h-9 w-36 rounded-md`} />
            <div className={`${styles.block} h-8 w-28 rounded-md`} />
          </div>
        </div>
      </header>

      <main className="shell py-6 space-y-6">
        {/* Intro Banner Skeleton */}
        <div className="rounded-lg border border-[#E3E8E4] bg-white p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-xl">
            <div className={`${styles.block} h-3.5 w-48 rounded`} />
            <div className={`${styles.block} h-7 w-64 rounded-md`} />
            <div className={`${styles.block} h-4 w-96 rounded`} />
          </div>
          <div className={`${styles.block} h-24 w-full md:w-80 rounded-lg`} />
        </div>

        {/* 4 Metrics Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} className="rounded-lg border border-[#E3E8E4] bg-white p-4 shadow-xs space-y-2">
              <div className={`${styles.block} h-3 w-28 rounded`} />
              <div className={`${styles.block} h-7 w-20 rounded-md`} />
              <div className={`${styles.block} h-3 w-36 rounded`} />
            </div>
          ))}
        </div>

        {/* Workspace Skeleton */}
        <div className="rounded-lg border border-[#E3E8E4] bg-white shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#E3E8E4] flex items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className={`${styles.block} h-5 w-32 rounded`} />
              <div className={`${styles.block} h-3.5 w-56 rounded`} />
            </div>
            <div className="flex items-center gap-2">
              <div className={`${styles.block} h-8 w-28 rounded-md`} />
              <div className={`${styles.block} h-8 w-24 rounded-md`} />
              <div className={`${styles.block} h-8 w-36 rounded-md`} />
            </div>
          </div>
          <div className="p-6 space-y-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
                <div className={`${styles.block} h-4 w-44 rounded`} />
                <div className={`${styles.block} h-4 w-52 rounded`} />
                <div className={`${styles.block} h-5 w-24 rounded`} />
                <div className={`${styles.block} h-4 w-16 rounded`} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

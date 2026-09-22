'use client';

import React from 'react';

// Base Shimmer / Skeleton Primitive
export function SkeletonBlock({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`bg-slate-200/80 animate-pulse rounded-xl ${className}`}
    />
  );
}

// 1. Module Page Skeleton Loader (/module/[slug])
export function ModuleSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Breadcrumb Nav Bar Skeleton */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="w-16 h-8 rounded-xl" />
          <SkeletonBlock className="w-24 h-8 rounded-xl" />
        </div>
        <SkeletonBlock className="w-28 h-8 rounded-xl" />
      </div>

      {/* Hero Banner Skeleton */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-100 to-slate-200/60 border border-slate-200 space-y-4 shadow-xs">
        <div className="flex items-center gap-4">
          <SkeletonBlock className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shrink-0" />
          <div className="space-y-2 flex-1 min-w-0">
            <SkeletonBlock className="w-3/5 h-7 rounded-lg" />
            <SkeletonBlock className="w-2/5 h-4 rounded-md" />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <SkeletonBlock className="w-20 h-6 rounded-full" />
          <SkeletonBlock className="w-24 h-6 rounded-full" />
          <SkeletonBlock className="w-20 h-6 rounded-full" />
        </div>
      </div>

      {/* Search & Filter Bar Skeleton */}
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-12 rounded-2xl flex-1" />
        <SkeletonBlock className="w-28 h-12 rounded-2xl hidden sm:block" />
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <SkeletonBlock className="w-10 h-10 rounded-2xl" />
              <SkeletonBlock className="w-16 h-5 rounded-full" />
            </div>
            <div className="space-y-2">
              <SkeletonBlock className="w-4/5 h-5 rounded-md" />
              <SkeletonBlock className="w-2/3 h-4 rounded-md" />
            </div>
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <SkeletonBlock className="w-20 h-4 rounded-md" />
              <SkeletonBlock className="w-6 h-6 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 2. Set Page Skeleton Loader (/set/[slug])
export function SetSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-8 animate-in fade-in duration-200">
      {/* Top Nav Bar Skeleton */}
      <div className="flex items-center justify-between gap-2 px-1 py-1 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="w-16 h-8 rounded-xl" />
          <SkeletonBlock className="w-24 h-8 rounded-xl hidden sm:block" />
        </div>
        <SkeletonBlock className="w-40 h-6 rounded-lg" />
        <SkeletonBlock className="w-16 h-8 rounded-xl" />
      </div>

      {/* Slimline Progress Bar */}
      <SkeletonBlock className="w-full h-1 rounded-full" />

      {/* Study Modes Bar Skeleton */}
      <div className="flex items-center gap-2 py-1">
        <SkeletonBlock className="w-28 h-9 rounded-xl" />
        <SkeletonBlock className="w-24 h-9 rounded-xl" />
        <SkeletonBlock className="w-24 h-9 rounded-xl" />
      </div>

      {/* Main Flashcard Container Skeleton */}
      <div className="min-h-[380px] sm:min-h-[440px] rounded-3xl bg-white border border-slate-200/90 p-8 shadow-xs flex flex-col items-center justify-center space-y-6">
        <SkeletonBlock className="w-12 h-12 rounded-2xl" />
        <div className="space-y-3 w-full flex flex-col items-center">
          <SkeletonBlock className="w-3/5 h-8 rounded-xl" />
          <SkeletonBlock className="w-2/5 h-5 rounded-lg" />
        </div>
        <SkeletonBlock className="w-36 h-4 rounded-md opacity-60" />
      </div>

      {/* Card Action Buttons Skeleton */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <SkeletonBlock className="w-28 h-12 rounded-2xl" />
        <SkeletonBlock className="w-36 h-12 rounded-2xl" />
        <SkeletonBlock className="w-28 h-12 rounded-2xl" />
      </div>
    </div>
  );
}

// 3. Test Page Skeleton Loader (/test/[slug])
export function TestSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8 animate-in fade-in duration-200">
      {/* Top Nav Bar Skeleton */}
      <div className="flex items-center justify-between gap-2 px-1 py-1 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="w-16 h-8 rounded-xl" />
          <SkeletonBlock className="w-24 h-8 rounded-xl hidden sm:block" />
        </div>
        <SkeletonBlock className="w-40 h-6 rounded-lg" />
        <SkeletonBlock className="w-20 h-8 rounded-xl" />
      </div>

      {/* Progress Bar */}
      <SkeletonBlock className="w-full h-1 rounded-full" />

      {/* Question Runner Card Skeleton */}
      <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 space-y-5 shadow-xs">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="w-20 h-6 rounded-lg" />
          <SkeletonBlock className="w-16 h-4 rounded-md" />
        </div>

        <SkeletonBlock className="w-full h-7 rounded-lg" />
        <SkeletonBlock className="w-3/4 h-7 rounded-lg" />

        {/* 4 Choices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 rounded-2xl border-2 border-slate-200/70 bg-slate-50/70 flex items-center gap-3"
            >
              <SkeletonBlock className="w-8 h-8 rounded-xl shrink-0" />
              <SkeletonBlock className="w-3/4 h-5 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 4. Story Page Skeleton Loader (/story/[slug])
export function StorySkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-8 animate-in fade-in duration-200">
      {/* Top Nav Bar Skeleton */}
      <div className="flex items-center justify-between gap-2 px-1 py-1 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="w-16 h-8 rounded-xl" />
          <SkeletonBlock className="w-24 h-8 rounded-xl hidden sm:block" />
        </div>
        <SkeletonBlock className="w-36 h-6 rounded-lg" />
        <div className="flex items-center gap-1">
          <SkeletonBlock className="w-8 h-8 rounded-xl" />
          <SkeletonBlock className="w-8 h-8 rounded-xl" />
          <SkeletonBlock className="w-14 h-8 rounded-xl" />
        </div>
      </div>

      {/* Progress Bar */}
      <SkeletonBlock className="w-full h-1 rounded-full" />

      {/* Book Page Card Skeleton */}
      <div className="rounded-3xl bg-[#faf6ee] border border-[#ebdcc4] p-6 sm:p-10 space-y-6 shadow-xs">
        <SkeletonBlock className="w-full h-56 sm:h-72 rounded-2xl bg-[#eee4d0]" />

        <div className="space-y-3">
          <SkeletonBlock className="w-full h-6 rounded-md bg-[#eee4d0]" />
          <SkeletonBlock className="w-4/5 h-6 rounded-md bg-[#eee4d0]" />
        </div>

        <div className="p-4 rounded-2xl bg-[#f4eedd] border border-[#e3d3ba] space-y-2">
          <SkeletonBlock className="w-24 h-4 rounded-md bg-[#e7dcb8]" />
          <SkeletonBlock className="w-2/3 h-5 rounded-md bg-[#e7dcb8]" />
        </div>

        {/* Bottom Page Nav */}
        <div className="pt-4 flex items-center justify-between border-t border-black/10">
          <SkeletonBlock className="w-28 h-10 rounded-xl bg-[#eee4d0]" />
          <SkeletonBlock className="w-28 h-10 rounded-xl bg-[#eee4d0]" />
        </div>
      </div>
    </div>
  );
}

// 5. Home Page Modules Skeleton Loader (src/app/page.tsx)
export function HomeSkeleton() {
  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-200">
      {/* Search Header Bar Skeleton */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <SkeletonBlock className="w-32 h-9 rounded-2xl" />
        <SkeletonBlock className="w-40 h-9 rounded-2xl" />
      </div>

      {/* Welcome Banner Skeleton */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-100 to-slate-200/70 border border-slate-200 space-y-3 shadow-xs">
        <SkeletonBlock className="w-2/5 h-7 rounded-lg" />
        <SkeletonBlock className="w-3/5 h-4 rounded-md" />
      </div>

      {/* Modules Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4"
          >
            <div className="flex items-center gap-3">
              <SkeletonBlock className="w-12 h-12 rounded-2xl" />
              <div className="space-y-1.5 flex-1">
                <SkeletonBlock className="w-3/4 h-5 rounded-md" />
                <SkeletonBlock className="w-1/2 h-3.5 rounded-md" />
              </div>
            </div>
            <div className="pt-2 flex items-center gap-2">
              <SkeletonBlock className="w-16 h-6 rounded-full" />
              <SkeletonBlock className="w-20 h-6 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

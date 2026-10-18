"use client";

import React from "react";

export const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => {
  return <div className={`skeleton ${className}`} />;
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="glass-card overflow-hidden flex flex-col h-full border-white/5 p-0">
      <div className="skeleton aspect-[16/10] rounded-none w-full" />
      <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="skeleton h-3 w-20 rounded-md" />
          <div className="skeleton h-5 w-3/4 rounded-lg" />
          <div className="skeleton h-3 w-full rounded-md" />
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="skeleton h-6 w-20 rounded-md" />
          <div className="skeleton h-9 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export const MatchCenterSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-8 rounded-3xl overflow-hidden border border-white/5 bg-card/40 p-6 space-y-4">
        <div className="skeleton aspect-[21/10] w-full rounded-2xl" />
        <div className="skeleton h-8 w-1/2 rounded-xl" />
        <div className="grid grid-cols-3 gap-3">
          <div className="skeleton h-16 rounded-xl" />
          <div className="skeleton h-16 rounded-xl" />
          <div className="skeleton h-16 rounded-xl" />
        </div>
      </div>
      <div className="lg:col-span-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 p-4 rounded-2xl border border-white/5 bg-card/30">
            <div className="skeleton w-12 h-12 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="skeleton h-3 w-16" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

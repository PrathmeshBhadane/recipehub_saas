import React from "react";

interface SkeletonLoaderProps {
  type?: "card" | "list" | "chart";
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ type = "card", count = 1 }) => {
  const renderItem = (index: number) => {
    if (type === "card") {
      return (
        <div key={index} className="glass-panel p-6 animate-pulse w-full rounded-2xl flex flex-col gap-4 border border-[var(--border-color)]">
          <div className="h-44 w-full bg-[var(--bg-tertiary)] rounded-xl"></div>
          <div className="h-6 w-3/4 bg-[var(--bg-tertiary)] rounded"></div>
          <div className="h-4 w-5/6 bg-[var(--bg-tertiary)] rounded"></div>
          <div className="flex gap-2 justify-between items-center mt-2">
            <div className="h-4 w-1/4 bg-[var(--bg-tertiary)] rounded"></div>
            <div className="h-4 w-1/4 bg-[var(--bg-tertiary)] rounded"></div>
          </div>
        </div>
      );
    }

    if (type === "list") {
      return (
        <div key={index} className="flex gap-4 items-center p-3 animate-pulse border-b border-[var(--border-color)]">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)]"></div>
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-4 w-1/2 bg-[var(--bg-tertiary)] rounded"></div>
            <div className="h-3 w-1/3 bg-[var(--bg-tertiary)] rounded"></div>
          </div>
        </div>
      );
    }

    return (
      <div key={index} className="glass-panel p-6 animate-pulse w-full h-72 border border-[var(--border-color)] rounded-2xl flex flex-col justify-end gap-4">
        <div className="flex gap-4 items-end h-full">
          <div className="w-full h-1/3 bg-[var(--bg-tertiary)] rounded-t"></div>
          <div className="w-full h-2/3 bg-[var(--bg-tertiary)] rounded-t"></div>
          <div className="w-full h-1/2 bg-[var(--bg-tertiary)] rounded-t"></div>
          <div className="w-full h-4/5 bg-[var(--bg-tertiary)] rounded-t"></div>
        </div>
        <div className="h-4 w-full bg-[var(--bg-tertiary)] rounded"></div>
      </div>
    );
  };

  return (
    <div className={`w-full ${type === "card" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-2"}`}>
      {Array.from({ length: count }).map((_, idx) => renderItem(idx))}
    </div>
  );
};
export default SkeletonLoader;

"use client";

import React from "react";

interface CollectionHeaderProps {
  title: string;
  description?: string | null;
  setCount: number;
}

export function CollectionHeader({
  title,
  description,
  setCount,
}: CollectionHeaderProps) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-b p-4 sm:p-6 md:p-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 break-words">
        {title}
      </h1>
      {description && (
        <p className="text-gray-700 mt-2 sm:mt-3 text-sm sm:text-base break-words">
          {description}
        </p>
      )}
      <div className="text-sm text-gray-600 mt-3 sm:mt-4">
        {setCount} flashcard {setCount === 1 ? "set" : "sets"}
      </div>
    </div>
  );
}

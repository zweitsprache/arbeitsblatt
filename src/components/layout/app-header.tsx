"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  const pathname = usePathname();
  const isEditor = pathname.startsWith("/editor");

  return (
    <header className="h-14 shadow-[0_2px_8px_rgba(0,0,0,0.08)] bg-background flex items-center px-4 shrink-0 z-30">
      {/* Logo / brand */}
      <Link
        href="/"
        className="flex items-center hover:opacity-80 transition-opacity"
      >
        <Image
          src="/logo/arbeitsblatt_logo_icon.svg"
          alt="Arbeitsblatt"
          width={32}
          height={32}
        />
      </Link>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-2">
        {!isEditor && (
          <Link href="/editor">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Worksheet
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}

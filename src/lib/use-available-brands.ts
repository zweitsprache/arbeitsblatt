"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import type { BrandProfile } from "@/types/worksheet";

/** Fetch all available brand profiles (with sub-profiles) on mount. */
export function useAvailableBrands() {
  const [brands, setBrands] = useState<BrandProfile[]>([]);

  useEffect(() => {
    authFetch("/api/brands")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: BrandProfile[]) => setBrands(data))
      .catch(() => {});
  }, []);

  return brands;
}

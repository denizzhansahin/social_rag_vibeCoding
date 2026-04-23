import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Copyright (c) 2026 Denizhan Şahin. All Rights Reserved. See LICENSE file for details.
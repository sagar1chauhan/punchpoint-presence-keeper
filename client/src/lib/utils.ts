import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolves a selfie URL (whether remote CDN, base64 data, or local /uploads path)
 * into a fully loadable URL in the browser.
 */
export function resolveSelfieUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const apiUrl = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";
  const serverOrigin = apiUrl.replace(/\/api\/?$/, "");
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${serverOrigin}${cleanPath}`;
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Форматирует размер в байтах в человеко-читаемый формат
 * @param bytes - Размер в байтах
 * @param decimals - Количество знаков после запятой (по умолчанию 2)
 * @returns Отформатированная строка (например, "1.5 MB")
 * @example
 * formatBytes(1024) // "1 KB"
 * formatBytes(1536, 1) // "1.5 KB"
 * formatBytes(0) // "0 Bytes"
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
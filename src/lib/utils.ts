import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ProcessingStatus } from '@/types';

/**
 * Combines class names using clsx and tailwind-merge for proper Tailwind CSS class handling
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formats processing status to human readable text
 */
export function formatProcessingStatus(status: ProcessingStatus): string {
  const statusLabels: Record<ProcessingStatus, string> = {
    idle: 'Pending',
    validating: 'Validating',
    parsing: 'Reading File',
    detecting: 'Detecting Prices',
    calculating: 'Calculating Markups',
    generating: 'Generating Output',
    completed: 'Completed',
    error: 'Error',
  };
  
  return statusLabels[status];
}

/**
 * Gets the appropriate color class for processing status
 */
export function getStatusColor(status: ProcessingStatus): string {
  const statusColors: Record<ProcessingStatus, string> = {
    idle: 'text-gray-500',
    validating: 'text-blue-500',
    parsing: 'text-blue-500',
    detecting: 'text-yellow-500',
    calculating: 'text-yellow-500',
    generating: 'text-blue-500',
    completed: 'text-green-500',
    error: 'text-red-500',
  };
  
  return statusColors[status];
}

/**
 * Formats confidence score as percentage
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Truncates filename for display
 */
export function truncateFilename(filename: string, maxLength: number = 30): string {
  if (filename.length <= maxLength) return filename;
  
  const ext = filename.split('.').pop();
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
  const truncatedName = nameWithoutExt.substring(0, maxLength - ext!.length - 4) + '...';
  
  return `${truncatedName}.${ext}`;
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Downloads a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
} 
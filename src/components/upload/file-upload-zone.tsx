'use client';

import React, { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { cn, formatFileSize } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FileUploadZoneProps, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/types';

/**
 * File upload zone component with drag-and-drop support for Excel files
 */
export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFilesSelected,
  maxFiles = 10,
  maxFileSize = MAX_FILE_SIZE,
  disabled = false,
  className,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = useCallback((files: FileList): File[] => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      // Check file type
      if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
        errors.push(`${file.name}: Invalid file type. Only Excel files are allowed.`);
        return;
      }

      // Check file size
      if (file.size > maxFileSize) {
        errors.push(`${file.name}: File size (${formatFileSize(file.size)}) exceeds maximum limit.`);
        return;
      }

      // Check empty file
      if (file.size === 0) {
        errors.push(`${file.name}: File is empty.`);
        return;
      }

      validFiles.push(file);
    });

    // Check max files limit
    if (validFiles.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed. Please select fewer files.`);
      return [];
    }

    if (errors.length > 0) {
      setError(errors.join('\n'));
      return [];
    }

    setError(null);
    return validFiles;
  }, [maxFiles, maxFileSize]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const files = event.dataTransfer.files;
    const validFiles = validateFiles(files);
    
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  }, [disabled, onFilesSelected, validateFiles]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const validFiles = validateFiles(files);
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
    // Reset input value to allow re-selecting the same file
    event.target.value = '';
  }, [onFilesSelected, validateFiles]);

  return (
    <div className={cn('w-full', className)}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          {
            'border-gray-300 bg-white': !isDragOver && !disabled,
            'border-blue-400 bg-blue-50': isDragOver && !disabled,
            'border-gray-200 bg-gray-50 cursor-not-allowed': disabled,
          }
        )}
      >
        <input
          type="file"
          multiple
          accept=".xlsx,.xls"
          onChange={handleFileInput}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className={cn(
            'mx-auto flex h-12 w-12 items-center justify-center rounded-full',
            {
              'bg-gray-100': !isDragOver && !disabled,
              'bg-blue-100': isDragOver && !disabled,
              'bg-gray-50': disabled,
            }
          )}>
            {isDragOver ? (
              <Upload className={cn('h-6 w-6', disabled ? 'text-gray-300' : 'text-blue-600')} />
            ) : (
              <FileSpreadsheet className={cn('h-6 w-6', disabled ? 'text-gray-300' : 'text-gray-400')} />
            )}
          </div>
          
          <div className="text-center">
            <p className={cn('text-sm font-medium', disabled ? 'text-gray-400' : 'text-gray-900')}>
              {isDragOver ? 'Drop Excel files here' : 'Upload Excel pricelists'}
            </p>
            <p className={cn('text-xs mt-1', disabled ? 'text-gray-300' : 'text-gray-500')}>
              Drag and drop files here, or click to browse
            </p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="pointer-events-none"
          >
            Choose Files
          </Button>
          
          <div className={cn('text-xs', disabled ? 'text-gray-300' : 'text-gray-400')}>
            <p>Supports .xlsx and .xls files</p>
            <p>Maximum {maxFiles} files, {formatFileSize(maxFileSize)} each</p>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start">
            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-red-700 whitespace-pre-line">{error}</div>
          </div>
        </div>
      )}
    </div>
  );
}; 
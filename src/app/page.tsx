'use client';

import React from 'react';
import { FileSpreadsheet, Download, Settings, CheckCircle } from 'lucide-react';
import { usePricelistStore } from '@/store/pricelist.store';
import { FileUploadZone } from '@/components/upload/file-upload-zone';
import { Button } from '@/components/ui/button';
import { 
  formatProcessingStatus, 
  getStatusColor, 
  formatConfidence, 
  truncateFilename 
} from '@/lib/utils';
import { ExportConfiguration } from '@/types';

/**
 * Main application page for the Supplier Pricelist Merger
 */
export default function HomePage() {
  const {
    files,
    isProcessing,
    globalProgress,
    errors,
    addFiles,
    removeFile,
    exportConsolidated,
    clearErrors,
    reset,
  } = usePricelistStore();

  const completedFiles = files.filter(file => file.status === 'completed');
  const hasFiles = files.length > 0;
  const canExport = completedFiles.length > 0;

  const handleExport = () => {
    const config: ExportConfiguration = {
      includeOriginalData: true,
      includeMarkupColumns: true,
      separateWorksheets: true,
      includeSummarySheet: true,
      filename: 'consolidated-pricelists.xlsx',
    };
    
    exportConsolidated(config);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                <FileSpreadsheet className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Supplier Pricelist Merger
                </h1>
                <p className="text-sm text-gray-500">
                  Upload, merge, and calculate markup pricing for supplier pricelists
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {hasFiles && (
                <Button
                  variant="outline"
                  onClick={reset}
                  disabled={isProcessing}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              )}
              
              {canExport && (
                <Button
                  onClick={handleExport}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Consolidated
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Processing Errors ({errors.length})
                </h3>
                <div className="mt-2 space-y-1">
                  {errors.map((error, index) => (
                    <p key={index} className="text-sm text-red-700">
                      {error.message}
                    </p>
                  ))}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearErrors}
                className="text-red-600 hover:text-red-700"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Global Progress */}
        {isProcessing && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-blue-900">
                Processing Files...
              </h3>
              <span className="text-sm text-blue-700">
                {Math.round(globalProgress)}%
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${globalProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Upload Section */}
        {!hasFiles && (
          <div className="text-center py-12">
            <FileUploadZone
              onFilesSelected={addFiles}
              disabled={isProcessing}
              className="max-w-2xl mx-auto"
            />
            
            <div className="mt-8 max-w-3xl mx-auto">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                How it works
              </h2>
              <div className="grid md:grid-cols-3 gap-6 text-left">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="flex items-center mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                      1
                    </div>
                    <h3 className="ml-3 text-sm font-medium text-gray-900">
                      Upload Excel Files
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Upload multiple supplier pricelist files (.xlsx or .xls format)
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="flex items-center mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 text-sm font-medium">
                      2
                    </div>
                    <h3 className="ml-3 text-sm font-medium text-gray-900">
                      Auto-Detect Prices
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    AI automatically detects cost price columns and calculates markups
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="flex items-center mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 text-sm font-medium">
                      3
                    </div>
                    <h3 className="ml-3 text-sm font-medium text-gray-900">
                      Export Consolidated
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Download a single Excel file with all pricelists and markup calculations
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Files List */}
        {hasFiles && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Uploaded Files ({files.length})
              </h2>
              
              <FileUploadZone
                onFilesSelected={addFiles}
                disabled={isProcessing}
                className="max-w-sm"
              />
            </div>

            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <div className="col-span-4">File</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Rows</div>
                  <div className="col-span-2">Cost Column</div>
                  <div className="col-span-1">Confidence</div>
                  <div className="col-span-1">Actions</div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {files.map((file) => (
                  <div key={file.id} className="px-6 py-4">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-4">
                        <div className="flex items-center space-x-3">
                          <FileSpreadsheet className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {truncateFilename(file.filename)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {file.uploadedAt.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-span-2">
                        <div className="flex items-center space-x-2">
                          {file.status === 'completed' && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          <span className={`text-sm ${getStatusColor(file.status)}`}>
                            {formatProcessingStatus(file.status)}
                          </span>
                        </div>
                        
                        {file.progress > 0 && file.progress < 100 && (
                          <div className="mt-1">
                            <div className="w-full bg-gray-200 rounded-full h-1">
                              <div 
                                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                                style={{ width: `${file.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="col-span-2">
                        <span className="text-sm text-gray-900">
                          {file.processedData?.totalRows || '-'}
                        </span>
                      </div>
                      
                      <div className="col-span-2">
                        <span className="text-sm text-gray-900">
                          {file.processedData?.detectedCostColumn !== undefined
                            ? `Column ${file.processedData.detectedCostColumn + 1}`
                            : '-'
                          }
                        </span>
                      </div>
                      
                      <div className="col-span-1">
                        <span className="text-sm text-gray-900">
                          {file.processedData?.confidence
                            ? formatConfidence(file.processedData.confidence)
                            : '-'
                          }
                        </span>
                      </div>
                      
                      <div className="col-span-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                          disabled={isProcessing}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    
                    {file.errors.length > 0 && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="text-sm text-red-700">
                          {file.errors.map((error, index) => (
                            <p key={index}>{error.message}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            {canExport && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-green-900">
                      Ready to Export
                    </h3>
                    <p className="text-sm text-green-700 mt-1">
                      {completedFiles.length} file{completedFiles.length !== 1 ? 's' : ''} processed successfully.
                      Export includes original data with 5%, 10%, 15%, 20%, and 30% markup calculations.
                    </p>
                  </div>
                  <Button
                    onClick={handleExport}
                    disabled={isProcessing}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Export Now
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

import {
  CostPriceDetectionService,
  DetectionResult,
  DetectionOptions,
  ExcelRow,
  CellValue,
  COST_PRICE_KEYWORDS,
} from '@/types';

/**
 * Service for detecting cost price columns in Excel data using multiple strategies
 * Uses header matching, data analysis, and heuristics to identify the most likely cost column
 */
export class CostPriceDetectionServiceImpl implements CostPriceDetectionService {
  private readonly defaultOptions: Required<DetectionOptions> = {
    minConfidence: 0.3,
    requiredDataRows: 5,
    customPriceKeywords: [],
  };

  /**
   * Detects the cost price column using multiple strategies
   * @param headers - Array of column headers
   * @param rows - Array of data rows (excluding header)
   * @param options - Detection configuration options
   * @returns Detection result with column index and confidence score
   */
  public detectCostPriceColumn(
    headers: readonly string[],
    rows: readonly ExcelRow[],
    options: DetectionOptions = {}
  ): DetectionResult {
    const opts = { ...this.defaultOptions, ...options };
    
    // Validate input data
    if (headers.length === 0) {
      return this.createLowConfidenceResult(-1, 'header_exact_match');
    }

    if (rows.length < opts.requiredDataRows) {
      return this.createLowConfidenceResult(-1, 'header_exact_match');
    }

    // Run all detection strategies
    const strategies = [
      () => this.detectByHeaderExactMatch(headers, opts),
      () => this.detectByHeaderPartialMatch(headers, opts),
      () => this.detectByDataPatterns(headers, rows),
      () => this.detectByPositionHeuristics(headers, rows),
    ];

    let bestResult: DetectionResult | null = null;

    for (const strategy of strategies) {
      const result = strategy();
      if (result.confidence >= opts.minConfidence) {
        if (!bestResult || result.confidence > bestResult.confidence) {
          bestResult = result;
        }
      }
    }

    // If no strategy met minimum confidence, try more aggressive fallbacks
    if (!bestResult) {
      // Try all strategies again with lower thresholds
      const fallbackStrategies = [
        () => this.detectByHeaderPartialMatch(headers, opts),
        () => this.detectByDataPatterns(headers, rows),
        () => this.detectByPositionHeuristics(headers, rows),
      ];

      for (const strategy of fallbackStrategies) {
        const result = strategy();
        if (result.confidence > 0.1) { // Very low threshold for fallback
          if (!bestResult || result.confidence > bestResult.confidence) {
            bestResult = result;
          }
        }
      }

             // If still no result, force detection on the most likely numeric column
       if (!bestResult) {
         const forcedResult = this.forceDetectBestNumericColumn(headers, rows);
         if (forcedResult) {
           bestResult = forcedResult;
         }
       }
     }

     return bestResult || this.createLowConfidenceResult(-1, 'header_exact_match');
  }

  /**
   * Detects cost column by exact header text matching
   */
  private detectByHeaderExactMatch(
    headers: readonly string[],
    options: Required<DetectionOptions>
  ): DetectionResult {
    const allKeywords = [...COST_PRICE_KEYWORDS, ...options.customPriceKeywords];
    
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i] || '').toLowerCase().trim();
      
      for (const keyword of allKeywords) {
        if (header === keyword.toLowerCase()) {
          return {
            columnIndex: i,
            confidence: 0.95,
            detectionMethod: 'header_exact_match',
          };
        }
      }
    }

    return this.createLowConfidenceResult(-1, 'header_exact_match');
  }

  /**
   * Detects cost column by partial header text matching
   */
  private detectByHeaderPartialMatch(
    headers: readonly string[],
    options: Required<DetectionOptions>
  ): DetectionResult {
    const allKeywords = [...COST_PRICE_KEYWORDS, ...options.customPriceKeywords];
    const matches: Array<{ index: number; score: number }> = [];

    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i] || '').toLowerCase().trim();
      let score = 0;

      for (const keyword of allKeywords) {
        if (header.includes(keyword.toLowerCase())) {
          // Higher score for keywords that appear at the beginning
          const position = header.indexOf(keyword.toLowerCase());
          const baseScore = keyword.length / header.length;
          const positionBonus = position === 0 ? 0.2 : 0;
          score = Math.max(score, baseScore + positionBonus);
        }
      }

      if (score > 0) {
        matches.push({ index: i, score });
      }
    }

    if (matches.length === 0) {
      return this.createLowConfidenceResult(-1, 'header_partial_match');
    }

    // Sort by score and return best match
    matches.sort((a, b) => b.score - a.score);
    const bestMatch = matches[0];
    
    // Calculate confidence based on score and competition
    const baseConfidence = Math.min(bestMatch.score * 0.8, 0.85);
    const competitionPenalty = matches.length > 1 ? 0.1 : 0;
    const confidence = Math.max(baseConfidence - competitionPenalty, 0.1);

    return {
      columnIndex: bestMatch.index,
      confidence,
      detectionMethod: 'header_partial_match',
      alternativeColumns: matches.slice(1, 3).map(m => m.index),
    };
  }

  /**
   * Detects cost column by analyzing data patterns
   */
  private detectByDataPatterns(
    headers: readonly string[],
    rows: readonly ExcelRow[]
  ): DetectionResult {
    const numericColumns: Array<{ index: number; score: number }> = [];

    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      const columnData = rows.map(row => row[colIndex]);
      const numericAnalysis = this.analyzeNumericColumn(columnData);

      if (numericAnalysis.isNumeric && numericAnalysis.score > 0.5) {
        // Boost score if header contains price-related terms
        const header = String(headers[colIndex] || '').toLowerCase();
        const headerBonus = COST_PRICE_KEYWORDS.some(keyword => 
          header.includes(keyword.toLowerCase())
        ) ? 0.3 : 0;

        numericColumns.push({
          index: colIndex,
          score: numericAnalysis.score + headerBonus,
        });
      }
    }

    if (numericColumns.length === 0) {
      return this.createLowConfidenceResult(-1, 'data_pattern_match');
    }

    // Sort by score and return best match
    numericColumns.sort((a, b) => b.score - a.score);
    const bestColumn = numericColumns[0];

    const confidence = Math.min(bestColumn.score * 0.75, 0.8);

    return {
      columnIndex: bestColumn.index,
      confidence,
      detectionMethod: 'data_pattern_match',
      alternativeColumns: numericColumns.slice(1, 3).map(c => c.index),
    };
  }

  /**
   * Detects cost column using position-based heuristics
   */
  private detectByPositionHeuristics(
    headers: readonly string[],
    rows: readonly ExcelRow[]
  ): DetectionResult {
    // Common positions for price columns (0-based) - expanded range
    const commonPricePositions = [1, 2, 3, 4, 5]; // Second through sixth columns
    
    for (const position of commonPricePositions) {
      if (position < headers.length) {
        const columnData = rows.map(row => row[position]);
        const numericAnalysis = this.analyzeNumericColumn(columnData);

        if (numericAnalysis.isNumeric && numericAnalysis.score > 0.01) {
          return {
            columnIndex: position,
            confidence: 0.4, // Lower confidence for heuristic-based detection
            detectionMethod: 'position_heuristic',
          };
        }
      }
    }

    return this.createLowConfidenceResult(-1, 'position_heuristic');
  }

  /**
   * Analyzes a column to determine if it contains numeric pricing data
   */
  private analyzeNumericColumn(columnData: readonly CellValue[]): {
    isNumeric: boolean;
    score: number;
  } {
    const nonNullValues = columnData.filter((value): value is number => 
      value !== null && typeof value === 'number' && !isNaN(value)
    );

    if (nonNullValues.length === 0) {
      return { isNumeric: false, score: 0 };
    }

    const totalValues = columnData.filter(value => value !== null).length;
    const numericRatio = nonNullValues.length / Math.max(totalValues, 1);

    // Must be at least 0.5% numeric to be considered (extremely relaxed for messy data)
    if (numericRatio < 0.005) {
      return { isNumeric: false, score: 0 };
    }

    // Analyze numeric patterns for pricing data
    const positiveValues = nonNullValues.filter(value => value > 0);
    const hasReasonableRange = this.hasReasonablePriceRange(positiveValues);
    const hasConsistentPrecision = this.hasConsistentDecimalPrecision(positiveValues);

    let score = numericRatio * 0.4; // Base score from numeric ratio

    if (hasReasonableRange) {
      score += 0.3;
    }

    if (hasConsistentPrecision) {
      score += 0.2;
    }

    // Bonus for having all positive values (typical for prices)
    if (positiveValues.length === nonNullValues.length && positiveValues.length > 0) {
      score += 0.1;
    }

    return {
      isNumeric: true,
      score: Math.min(score, 1.0),
    };
  }

  /**
   * Checks if numeric values fall within a reasonable price range
   */
  private hasReasonablePriceRange(values: readonly number[]): boolean {
    if (values.length === 0) return false;

    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    // Reasonable price range heuristics
    return (
      min >= 0.01 && // Not too small
      max <= 1000000 && // Not unreasonably large
      max / Math.max(min, 0.01) <= 10000 // Not too wide a range
    );
  }

  /**
   * Checks if values have consistent decimal precision (typical for prices)
   */
  private hasConsistentDecimalPrecision(values: readonly number[]): boolean {
    if (values.length === 0) return false;

    const precisions = values.map(value => {
      const str = value.toString();
      const decimalIndex = str.indexOf('.');
      return decimalIndex === -1 ? 0 : str.length - decimalIndex - 1;
    });

    // Most values should have 0-3 decimal places (typical for prices)
    const reasonablePrecisions = precisions.filter(p => p >= 0 && p <= 3);
    return reasonablePrecisions.length / precisions.length >= 0.8;
  }

  /**
   * Creates a low confidence result for failed detection attempts
   */
  private createLowConfidenceResult(
    columnIndex: number,
    method: DetectionResult['detectionMethod']
  ): DetectionResult {
    return {
      columnIndex,
      confidence: 0,
      detectionMethod: method,
    };
  }

  /**
   * Forces detection of the best numeric column when normal strategies fail
   */
  private forceDetectBestNumericColumn(
    headers: readonly string[],
    rows: readonly ExcelRow[]
  ): DetectionResult | null {
    let bestColumn = -1;
    let bestScore = 0;

    for (let i = 0; i < headers.length; i++) {
      const columnData = rows.map(row => row[i]);
      const analysis = this.analyzeNumericColumn(columnData);
      
      if (analysis.isNumeric && analysis.score > bestScore) {
        bestScore = analysis.score;
        bestColumn = i;
      }
    }

    if (bestColumn >= 0) {
      return {
        columnIndex: bestColumn,
        confidence: Math.min(bestScore * 0.5, 0.4), // Lower confidence for forced detection
        detectionMethod: 'forced_numeric',
      };
    }

    return null;
  }
}

// Export singleton instance
export const costPriceDetectionService = new CostPriceDetectionServiceImpl(); 
import * as math from 'mathjs';
import { unitFullNames } from './unitMap';

export interface CalculatorResult {
  result: string | null;
  isValid: boolean;
  isPartial: boolean;
  inputUnit: string;
  outputUnit: string;
  error?: string;
}

const expandedMath = math.create(math.all);

expandedMath.import({
  five: 5,
  ten: 10,
  three: 3,
  four: 4,
  eight: 8,
  sixteen: 16,
  twenty: 20,
  twentyfive: 25,
  fifty: 50,
  hundred: 100,
  plus: (a: number, b: number) => a + b,
  minus: (a: number, b: number) => a - b,
  times: (a: number, b: number) => a * b,
  divided: (a: number, b: number) => a / b,
  power: (a: number, b: number) => Math.pow(a, b),
  half: (a: number) => a / 2,
  double: (a: number) => a * 2,
  quarter: (a: number) => a / 4,

  // String functions
  length: (str: string) => str.length,
  concat: (...args: string[]) => args.join(''),
  uppercase: (str: string) => str.toUpperCase(),
  lowercase: (str: string) => str.toLowerCase(),
  substr: (str: string, start: number, length: number) => str.substr(start, length),

  // Random functions
  randomInt: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,

  // Comparison and Boolean operations
  and: (a: boolean, b: boolean) => a && b,
  or: (a: boolean, b: boolean) => a || b,
  not: (a: boolean) => !a,

  // Combinatorics
  permutations: (n: number, r: number) => expandedMath.combinations(n, r) * expandedMath.factorial(r),
  nPr: (n: number, r: number) => expandedMath.combinations(n, r) * expandedMath.factorial(r),
  nCr: (n: number, r: number) => expandedMath.combinations(n, r),

  // Number theory
  gcd: (a: number, b: number) => expandedMath.gcd(a, b),
  lcm: (a: number, b: number) => expandedMath.lcm(a, b),

  // Precision functions
  precision: (num: number, digits: number) => parseFloat(num.toPrecision(digits)),
  fix: (num: number, digits: number) => parseFloat(num.toFixed(digits)),

  // Percentage operations
  percent: (value: number) => value / 100,
  
  // Financial operations
  compound: (principal: number, rate: number, time: number) => principal * Math.pow(1 + rate, time),
}, { override: true });

function detectUnit(expression: string): string {
  try {
    const unit = expandedMath.unit(expression);
    if (unit) {
      const unitStr = unit.formatUnits();
      return unitFullNames[unitStr] || unitStr;
    }
  } catch (e) {
    // Not a unit or invalid expression
  }
  return '';
}

function isLikelyMathExpression(input: string): boolean {
  const trimmed = input.trim();
  
  // Must contain at least one digit or mathematical operator
  if (!/[\d+\-*/^()=.]/.test(trimmed)) {
    return false;
  }
  
  // Check for common non-math words that shouldn't trigger calculator
  const nonMathWords = ['abs', 'function', 'class', 'const', 'let', 'var', 'if', 'else', 'while', 'for', 'return', 'import', 'export'];
  const words = trimmed.toLowerCase().split(/\s+/);
  
  // If it's just a single non-math word, skip it
  if (words.length === 1 && nonMathWords.includes(words[0]) && !/\d/.test(trimmed)) {
    return false;
  }
  
  // Must have some mathematical content
  const mathPattern = /(\d+\.?\d*|\+|\-|\*|\/|\^|\(|\)|sin|cos|tan|log|sqrt|pi|e|=)/i;
  return mathPattern.test(trimmed);
}

function tryCompleteExpression(expression: string): string | null {
  const trimmed = expression.trim();
  
  // Common patterns for incomplete expressions
  const incompletePatterns = [
    /[\+\-\*\/\^]\s*$/,  // ends with operator
    /\(\s*$/,            // ends with opening parenthesis
    /[\+\-\*\/\^]\s*\(/,  // operator followed by opening parenthesis
  ];
  
  for (const pattern of incompletePatterns) {
    if (pattern.test(trimmed)) {
      // Try to evaluate what we have so far by removing the incomplete part
      let partial = trimmed.replace(/[\+\-\*\/\^]\s*$/, '').trim();
      
      // Handle cases like "4 + 3 *" -> evaluate "4 + 3"
      if (partial && !partial.match(/[\+\-\*\/\^]\s*$/)) {
        try {
          const result = expandedMath.evaluate(partial);
          if (typeof result === 'number' && !isNaN(result)) {
            return expandedMath.format(result, { precision: 14, lowerExp: -15, upperExp: 15 });
          }
        } catch (e) {
          // Continue to other attempts
        }
      }
    }
  }
  
  return null;
}

export function calculateExpression(input: string): CalculatorResult {
  const trimmed = input.trim();
  
  // Early exit for empty or very short inputs
  if (!trimmed || (trimmed.length <= 2 && !/\d/.test(trimmed))) {
    return {
      result: null,
      isValid: false,
      isPartial: false,
      inputUnit: '',
      outputUnit: '',
    };
  }
  
  // Check if this looks like a math expression at all
  if (!isLikelyMathExpression(trimmed)) {
    return {
      result: null,
      isValid: false,
      isPartial: false,
      inputUnit: '',
      outputUnit: '',
    };
  }
  
  try {
    // First try to evaluate the expression as-is
    const evaluated = expandedMath.evaluate(trimmed.replace('**', '^'));
    
    if (evaluated !== undefined) {
      let result: string;
      let inputUnit = '';
      let outputUnit = '';
      
      if (math.typeOf(evaluated) === 'Unit') {
        // Handle unit conversion results
        result = expandedMath.format(evaluated, { precision: 14, lowerExp: -15, upperExp: 15 });
        inputUnit = detectUnit(trimmed);
        outputUnit = detectUnit(result);
      } else if (typeof evaluated === 'number') {
        // Handle regular numbers
        result = math.format(evaluated, { precision: 14, lowerExp: -15, upperExp: 15 });
      } else {
        result = math.format(evaluated, { precision: 14, lowerExp: -15, upperExp: 15 });
      }
      
      return {
        result,
        isValid: true,
        isPartial: false,
        inputUnit,
        outputUnit,
      };
    }
  } catch (error) {
    // Try to handle incomplete expressions
    const partialResult = tryCompleteExpression(trimmed);
    
    if (partialResult) {
      return {
        result: partialResult,
        isValid: true,
        isPartial: true,
        inputUnit: '',
        outputUnit: '',
      };
    }
    
    // If it still looks like math but failed, return the error
    return {
      result: null,
      isValid: false,
      isPartial: false,
      inputUnit: '',
      outputUnit: '',
      error: error instanceof Error ? error.message : 'Invalid expression',
    };
  }
  
  return {
    result: null,
    isValid: false,
    isPartial: false,
    inputUnit: '',
    outputUnit: '',
  };
} 
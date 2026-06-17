import { create, all, typeOf as mathTypeOf, format as mathFormat } from 'mathjs';
import { unitFullNames } from './unitMap';

export interface CalculatorResult {
  result: string | null;
  isValid: boolean;
  isPartial: boolean;
  inputUnit: string;
  outputUnit: string;
  error?: string;
}

/** Hard cap on calculator input length to limit parse/eval cost. */
export const CALCULATOR_MAX_INPUT_LENGTH = 128;

/**
 * Functions safe to replace with stubs. Do not block type constructors
 * (`complex`, `typed`, `fraction`, `bignumber`, `sparse`) or parse pipeline
 * (`parse`, `compile`, `parser`) — mathjs needs those internally and
 * `evaluate()` depends on them.
 */
const BLOCKED_MATH_FUNCTIONS = [
  'import',
  'createUnit',
  'random',
  'pickRandom',
  'chain',
  'help',
] as const;

function createSandboxedMath() {
  const sandbox = create(all);
  const blockFn = () => {
    throw new Error('Function not allowed');
  };
  const blocked: Record<string, () => never> = {};
  for (const name of BLOCKED_MATH_FUNCTIONS) {
    blocked[name] = blockFn;
  }
  sandbox.import(blocked, { override: true });
  return sandbox;
}

const calculatorMath = createSandboxedMath();

function detectUnit(expression: string): string {
  try {
    const unit = calculatorMath.unit(expression);
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
          const result = calculatorMath.evaluate(partial);
          if (typeof result === 'number' && !isNaN(result)) {
            return calculatorMath.format(result, { precision: 14, lowerExp: -15, upperExp: 15 });
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

  if (trimmed.length > CALCULATOR_MAX_INPUT_LENGTH) {
    return {
      result: null,
      isValid: false,
      isPartial: false,
      inputUnit: '',
      outputUnit: '',
      error: `Expression too long (max ${CALCULATOR_MAX_INPUT_LENGTH} characters)`,
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
    const evaluated = calculatorMath.evaluate(trimmed.replace('**', '^'));
    
    if (evaluated !== undefined) {
      let result: string;
      let inputUnit = '';
      let outputUnit = '';
      
      if (mathTypeOf(evaluated) === 'Unit') {
        // Handle unit conversion results
        result = calculatorMath.format(evaluated, { precision: 14, lowerExp: -15, upperExp: 15 });
        inputUnit = detectUnit(trimmed);
        outputUnit = detectUnit(result);
      } else if (typeof evaluated === 'number') {
        // Handle regular numbers
        result = mathFormat(evaluated, { precision: 14, lowerExp: -15, upperExp: 15 });
      } else {
        result = mathFormat(evaluated, { precision: 14, lowerExp: -15, upperExp: 15 });
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

import {
  create, absDependencies, addDependencies, cosDependencies, divideDependencies, eDependencies,
  evaluateDependencies, formatDependencies, log10Dependencies, logDependencies, modDependencies,
  multiplyDependencies, piDependencies, powDependencies, sinDependencies, sqrtDependencies,
  subtractDependencies, tanDependencies, toDependencies, typeOfDependencies, unaryMinusDependencies,
  unaryPlusDependencies, unitDependencies,
} from 'mathjs';
import { unitFullNames } from './unitMap';

export interface CalculatorResult {
  result: string | null;
  isValid: boolean;
  isPartial: boolean;
  inputUnit: string;
  outputUnit: string;
  error?: string;
}

export const CALCULATOR_MAX_INPUT_LENGTH = 128;

const CALCULATOR_MATH_CONFIG = Object.assign(
  {},
  evaluateDependencies, formatDependencies, unitDependencies, typeOfDependencies,
  addDependencies, subtractDependencies, multiplyDependencies, divideDependencies,
  powDependencies, modDependencies, unaryMinusDependencies, unaryPlusDependencies,
  absDependencies, sqrtDependencies, logDependencies, log10Dependencies,
  sinDependencies, cosDependencies, tanDependencies, toDependencies,
  piDependencies, eDependencies,
);

const BLOCKED_MATH_FUNCTIONS = ['import', 'createUnit', 'random', 'pickRandom', 'chain', 'help'] as const;

function createSandboxedMath() {
  const sandbox = create(CALCULATOR_MATH_CONFIG);
  const blockFn = () => { throw new Error('Function not allowed'); };
  const blocked: Record<string, () => never> = {};
  for (const name of BLOCKED_MATH_FUNCTIONS) blocked[name] = blockFn;
  sandbox.import(blocked, { override: true });
  return sandbox;
}

const calculatorMath = createSandboxedMath();
const FORMAT_OPTS = { precision: 14, lowerExp: -15, upperExp: 15 } as const;
const emptyResult = (error?: string): CalculatorResult => ({
  result: null, isValid: false, isPartial: false, inputUnit: '', outputUnit: '', error,
});

function detectUnit(expression: string): string {
  try {
    const unit = calculatorMath.unit(expression);
    if (unit) {
      const unitStr = unit.formatUnits();
      return unitFullNames[unitStr] || unitStr;
    }
  } catch {}
  return '';
}

function isLikelyMathExpression(input: string): boolean {
  const trimmed = input.trim();
  if (!/[\d+\-*/^()=.]/.test(trimmed)) return false;
  const nonMathWords = ['abs', 'function', 'class', 'const', 'let', 'var', 'if', 'else', 'while', 'for', 'return', 'import', 'export'];
  const words = trimmed.toLowerCase().split(/\s+/);
  if (words.length === 1 && nonMathWords.includes(words[0]) && !/\d/.test(trimmed)) return false;
  return /(\d+\.?\d*|\+|\-|\*|\/|\^|\(|\)|sin|cos|tan|log|sqrt|pi|e|=)/i.test(trimmed);
}

function tryCompleteExpression(expression: string): string | null {
  const trimmed = expression.trim();
  for (const pattern of [/[\+\-\*\/\^]\s*$/, /\(\s*$/, /[\+\-\*\/\^]\s*\(/]) {
    if (!pattern.test(trimmed)) continue;
    const partial = trimmed.replace(/[\+\-\*\/\^]\s*$/, '').trim();
    if (!partial || partial.match(/[\+\-\*\/\^]\s*$/)) continue;
    try {
      const result = calculatorMath.evaluate(partial);
      if (typeof result === 'number' && !isNaN(result)) {
        return calculatorMath.format(result, FORMAT_OPTS);
      }
    } catch {}
  }
  return null;
}

export function calculateExpression(input: string): CalculatorResult {
  const trimmed = input.trim();
  if (!trimmed || (trimmed.length <= 2 && !/\d/.test(trimmed))) return emptyResult();
  if (trimmed.length > CALCULATOR_MAX_INPUT_LENGTH) {
    return emptyResult(`Expression too long (max ${CALCULATOR_MAX_INPUT_LENGTH} characters)`);
  }
  if (!isLikelyMathExpression(trimmed)) return emptyResult();

  try {
    const evaluated = calculatorMath.evaluate(trimmed.replace('**', '^'));
    if (evaluated !== undefined) {
      const result = calculatorMath.format(evaluated, FORMAT_OPTS);
      const isUnit = calculatorMath.typeOf(evaluated) === 'Unit';
      return {
        result,
        isValid: true,
        isPartial: false,
        inputUnit: isUnit ? detectUnit(trimmed) : '',
        outputUnit: isUnit ? detectUnit(result) : '',
      };
    }
  } catch (error) {
    const partialResult = tryCompleteExpression(trimmed);
    if (partialResult) {
      return { result: partialResult, isValid: true, isPartial: true, inputUnit: '', outputUnit: '' };
    }
    return emptyResult(error instanceof Error ? error.message : 'Invalid expression');
  }

  return emptyResult();
}

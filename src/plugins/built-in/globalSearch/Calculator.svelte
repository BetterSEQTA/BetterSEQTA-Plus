<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import debounce from '@/seqta/utils/debounce';
  import * as math from 'mathjs';

  let { searchTerm = '', isSelected = false } = $props<{ searchTerm: string, isSelected: boolean }>();
  
  const dispatch = createEventDispatcher<{
    hasResult: string | null;
  }>();
  
  let result = $state<string | null>(null);
  let isCalculating = $state(false);
  let inputUnit = $state<string>('');
  let outputUnit = $state<string>('');

  // Map of unit abbreviations to full names
  const unitFullNames: Record<string, string> = {
    km: 'Kilometers',
    m: 'Meters',
    cm: 'Centimeters',
    mm: 'Millimeters',
    mi: 'Miles',
    ft: 'Feet',
    in: 'Inches',
    kg: 'Kilograms',
    g: 'Grams',
    lb: 'Pounds',
    oz: 'Ounces',
    l: 'Liters',
    ml: 'Milliliters',
    gal: 'Gallons',
    h: 'Hours',
    min: 'Minutes',
    s: 'Seconds',
    ms: 'Milliseconds'
  };

  function detectUnit(expression: string): string {
    try {
      const unit = math.unit(expression);
      if (unit) {
        // Get the base unit name
        const unitStr = unit.formatUnits();
        return unitFullNames[unitStr] || unitStr;
      }
    } catch (e) {
      // Not a unit or invalid expression
    }
    return '';
  }
  
  // Process the input with debounce to avoid unnecessary calculations
  const processInput = debounce((input: string) => {
    try {
      if (!input.trim()) {
        result = null;
        inputUnit = '';
        outputUnit = '';
        dispatch('hasResult', null);
        return;
      }
      
      isCalculating = true;
      
      // Let mathjs handle everything
      const evaluated = math.evaluate(input);
      
      // Format the result
      if (evaluated !== undefined) {
        if (math.typeOf(evaluated) === 'Unit') {
          // Handle unit conversion results
          result = math.format(evaluated, { precision: 14 });
          inputUnit = detectUnit(input);
          outputUnit = detectUnit(result);
        } else if (typeof evaluated === 'number') {
          // Handle regular numbers
          if (math.round(evaluated) === evaluated) {
            result = math.format(evaluated, { precision: 14 });
          } else {
            result = math.format(evaluated, { precision: 14 });
          }
          inputUnit = '';
          outputUnit = '';
        } else {
          result = math.format(evaluated, { precision: 14 });
          inputUnit = '';
          outputUnit = '';
        }
        dispatch('hasResult', result);
      } else {
        result = null;
        inputUnit = '';
        outputUnit = '';
        dispatch('hasResult', null);
      }
    } catch (e) {
      // If mathjs throws an error, this isn't a valid expression
      result = null;
      inputUnit = '';
      outputUnit = '';
      dispatch('hasResult', null);
    } finally {
      isCalculating = false;
    }
  }, 3);
  
  $effect(() => {
    processInput(searchTerm);
  });
  
  onDestroy(() => {
    dispatch('hasResult', null);
  });
</script>

{#if result !== null}
<div class="p-2">
  <p class="text-[0.85rem] p-1 pb-0.5 font-semibold text-zinc-500 dark:text-zinc-400">Calculator</p>
  <div class="flex items-center justify-between gap-8 rounded-lg border border-transparent {isSelected ? 'bg-zinc-900/5 dark:bg-white/10 border-zinc-900/5 dark:border-zinc-100/5' : ''}">
    <div class="flex flex-col flex-1 items-center py-4 pl-4">
      <div class="text-3xl font-semibold text-zinc-900 dark:text-white">
        {searchTerm}
      </div>
      <div class="px-3 py-1 mt-1 text-sm rounded-md text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800">
        {inputUnit || 'Question'}
      </div>
    </div>

    <div class="flex flex-col justify-center items-center w-12">
      <div class="h-8 w-[1px] bg-zinc-900/5 dark:bg-zinc-100/5"></div>
      <div class="text-2xl text-zinc-600 dark:text-zinc-400">
        →
      </div>
      <div class="h-8 w-[1px] bg-zinc-900/5 dark:bg-zinc-100/5"></div>
    </div>

    {#if !isCalculating}
      <div class="flex flex-col flex-1 items-center py-4 pr-4">
        <div class="text-3xl font-semibold text-zinc-900 dark:text-white">
          {result}
        </div>
        <div class="px-3 py-1 mt-1 text-sm rounded-md text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800">
          {outputUnit || 'Result'}
        </div>
      </div>
    {:else}
      <div class="w-6 h-6 rounded-full border-2 animate-spin border-zinc-300 dark:border-zinc-700 border-t-zinc-600 dark:border-t-zinc-300"></div>
    {/if}
  </div>
</div>
{/if}
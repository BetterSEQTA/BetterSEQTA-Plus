<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { calculateExpression } from '../utils/calculator';

  let { searchTerm = '', isSelected = false } = $props<{ searchTerm: string, isSelected: boolean }>();
  
  const dispatch = createEventDispatcher<{
    hasResult: string | null;
  }>();
  
  let result = $state<string | null>(null);
  let isCalculating = $state(false);
  let inputUnit = $state<string>('');
  let outputUnit = $state<string>('');
  let isPartial = $state(false);
  
  const processInput = (input: string) => {
    isCalculating = true;
    
    try {
      const calcResult = calculateExpression(input);
      
      if (calcResult.isValid) {
        result = calcResult.result;
        inputUnit = calcResult.inputUnit;
        outputUnit = calcResult.outputUnit;
        isPartial = calcResult.isPartial;
        dispatch('hasResult', calcResult.result);
      } else {
        result = null;
        inputUnit = '';
        outputUnit = '';
        isPartial = false;
        dispatch('hasResult', null);
      }
    } catch (e) {
      result = null;
      inputUnit = '';
      outputUnit = '';
      isPartial = false;
      dispatch('hasResult', null);
    } finally {
      isCalculating = false;
    }
  }
  
  $effect(() => {
    processInput(searchTerm);
  });
  
  onDestroy(() => {
    dispatch('hasResult', null);
  });
</script>

{#if result !== null}
<div class="">
  <p class="text-[0.85rem] p-1 pb-0.5 pt-0 font-semibold text-zinc-500 dark:text-zinc-400">Calculator</p>
  <div class="flex items-center justify-between gap-8 rounded-lg border border-transparent {isSelected ? 'bg-zinc-900/5 dark:bg-white/10 border-zinc-900/5 dark:border-zinc-100/5' : ''}">
    <div class="flex flex-col flex-1 items-center py-4 pl-4 min-w-0">
      <div class="overflow-hidden py-2 w-full font-semibold text-center whitespace-nowrap text-zinc-900 dark:text-white text-ellipsis" 
        style="--char-count: {searchTerm?.length || 10}; font-size: min(2.5rem, max(1rem, calc(35vw / var(--char-count, 10))))">
        {searchTerm}
      </div>
      <div class="px-3 py-1 mt-1 text-sm rounded-md text-zinc-900 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-100/10">
        {inputUnit || 'Question'}
      </div>
    </div>

    <div class="flex flex-col flex-shrink-0 justify-center items-center w-12">
      <div class="h-8 w-[1px] bg-zinc-900/5 dark:bg-zinc-100/5"></div>
      <div class="text-2xl text-zinc-900 dark:text-zinc-100">
        →
      </div>
      <div class="h-8 w-[1px] bg-zinc-900/5 dark:bg-zinc-100/5"></div>
    </div>

    {#if !isCalculating}
      <div class="flex flex-col flex-1 items-center py-4 pr-4 min-w-0">
        <div class="overflow-hidden py-2 w-full font-semibold text-center whitespace-nowrap text-zinc-900 dark:text-white text-ellipsis" 
             style="--char-count: {result?.length || 10}; font-size: min(2.5rem, max(1rem, calc(30vw / var(--char-count, 10))))">
          {result}
        </div>
        <div class="px-3 py-1 mt-1 text-sm rounded-md text-zinc-900 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-100/10">
          {outputUnit || (isPartial ? 'Partial' : 'Result')}
        </div>
      </div>
    {:else}
      <div class="w-6 h-6 rounded-full border-2 animate-spin border-zinc-300 dark:border-zinc-700 border-t-zinc-600 dark:border-t-zinc-300"></div>
    {/if}
  </div>
</div>
{/if}
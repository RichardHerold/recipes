<script>
  import { isInstructionSubsection, extractInstructionText } from '../utils/parsing.js';

  export let instructions = [];
  export let scaleFactor = 1;

  function shouldShowScaleNote(step, factor) {
    if (!step?.scaleAdjustment) return false;
    if (typeof step.scaleAdjustment.trigger !== 'number') {
      return true;
    }
    return factor >= step.scaleAdjustment.trigger;
  }
</script>

<ol class="instruction-list">
  {#each instructions as step, index}
    {#if isInstructionSubsection(step)}
      <li class="instruction-subsection">
        <p class="subsection-label">{step.subsection}</p>
        <ol>
          {#each step.items as nested, nestedIndex}
            <li>{nested}</li>
          {/each}
        </ol>
      </li>
    {:else}
      <li>
        <p>{extractInstructionText(step)}</p>
        {#if shouldShowScaleNote(step, scaleFactor)}
          <small class="instruction-note">{step.scaleAdjustment.note}</small>
        {/if}
      </li>
    {/if}
  {/each}
</ol>

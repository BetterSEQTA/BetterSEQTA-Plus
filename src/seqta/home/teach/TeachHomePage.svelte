<script lang="ts">
  import { onMount } from "svelte";
  import { initTeachHomeWidgets } from "@/seqta/utils/Loaders/LoadTeachHomePage";

  let widgetCleanup: (() => void) | undefined;

  function timeGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning!";
    if (hour < 17) return "Good afternoon!";
    return "Good evening!";
  }

  onMount(() => {
    void initTeachHomeWidgets().then((cleanup) => {
      widgetCleanup = cleanup;
    });

    return () => {
      widgetCleanup?.();
    };
  });
</script>

<div class="home-container" id="home-container">
  <h1 id="home-greeting" class="teach-home-greeting">{timeGreeting()}</h1>

  <div class="stats-summary" id="stats-summary"></div>

  <div class="border shortcut-container" data-home-widget="shortcuts">
    <div class="border shortcuts" id="shortcuts"></div>
  </div>

  <div class="border timetable-container" data-home-widget="timetable">
    <div class="home-subtitle">
      <h2 id="home-lesson-subtitle">Today's Lessons</h2>
      <div class="timetable-arrows">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          style="transform: scale(-1,1)"
          id="home-timetable-back"
          aria-hidden="true"
        >
          <g style="fill: currentcolor"
            ><path
              d="M8.578 16.359l4.594-4.594-4.594-4.594 1.406-1.406 6 6-6 6z"
            ></path></g
          >
        </svg>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          id="home-timetable-forward"
          aria-hidden="true"
        >
          <g style="fill: currentcolor"
            ><path
              d="M8.578 16.359l4.594-4.594-4.594-4.594 1.406-1.406 6 6-6 6z"
            ></path></g
          >
        </svg>
      </div>
    </div>
    <div class="day-container loading" id="day-container"></div>
  </div>

  <div class="border upcoming-container" data-home-widget="upcomingAssessments">
    <div class="upcoming-title">
      <h2 class="home-subtitle">Upcoming Assessments to Mark</h2>
      <div class="upcoming-filters" id="upcoming-filters"></div>
    </div>
    <div class="upcoming-items loading" id="upcoming-items"></div>
  </div>

  <div class="border messages-container" data-home-widget="messages">
    <div class="home-subtitle">
      <h2>Direqt Messages</h2>
      <a href="/messages" class="teach-home-view-all">View All</a>
    </div>
    <div class="messages-items loading" id="messages-container"></div>
  </div>

  <div class="border notices-container" data-home-widget="notices">
    <div class="home-subtitle notices-header">
      <h2>Notices</h2>
      <input type="date" class="teach-home-notices-date" aria-label="Notices date" />
    </div>
    <div class="notice-container upcoming-items loading" id="notice-container"></div>
  </div>
</div>

<style>
  .teach-home-view-all {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 14px;
    margin-right: 20px;
    transition: color 0.2s ease;
  }

  .teach-home-view-all:hover {
    color: var(--accent-bg);
  }

  .notices-header {
    width: 100%;
  }

  .teach-home-notices-date {
    margin-right: 20px;
    background: var(--background-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    padding: 4px 8px;
    font-family: Rubik, sans-serif;
  }

  .teach-home-greeting {
    color: var(--text-primary);
    font-family: Rubik, sans-serif;
  }
</style>

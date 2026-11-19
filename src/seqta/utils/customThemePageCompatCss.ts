/**
 * Appended after custom theme CSS on SEQTA pages.
 * Prevents community/home-baked theme rules from breaking course, assessment, and Engage UI.
 */
export const CUSTOM_THEME_PAGE_COMPAT_CSS = `
/* BetterSEQTA+ — custom theme compatibility (courses / assessments / Engage) */

body:has(#main > .course) #main::after,
body:has(#main > .assessments) #main::after,
body:has(.assessmentsWrapper) #main::after {
  display: none !important;
  content: none !important;
  animation: none !important;
}

#main > .course,
#main > .course > .content,
#main > .assessments,
.assessmentsWrapper {
  background: transparent !important;
}

#main > .course *,
#main > .assessments *,
.assessmentsWrapper *,
[class*="SelectedAssessment__SelectedAssessment___"],
[class*="SelectedAssessment__SelectedAssessment___"] *,
[class*="TabSet__TabSet___"],
[class*="TabSet__TabSet___"] * {
  animation: none !important;
}

[class*="BasicPanel__BasicPanel___"] {
  position: static !important;
  overflow: visible !important;
  box-shadow: none !important;
  border-radius: inherit !important;
  background: var(--background-primary) !important;
}

[class*="BasicPanel__BasicPanel___"]::before,
[class*="BasicPanel__BasicPanel___"]::after {
  content: none !important;
  display: none !important;
}

#main > .course .message,
#main > .course .thread,
#main > .assessments .message,
#main > .assessments .thread,
.assessmentsWrapper .message,
[class*="MessageList__"],
[class*="SelectedAssessment__SelectedAssessment___"] {
  background: unset !important;
  border: unset !important;
  box-shadow: unset !important;
  transform: none !important;
  border-radius: inherit !important;
}

#main > .course .message::before,
#main > .course .thread::before,
#main > .assessments .message::before,
#main > .assessments .thread::before,
[class*="SelectedAssessment__SelectedAssessment___"]::before {
  content: none !important;
  display: none !important;
}

#content:has(#main > .course) #container,
#content:has(#main > .assessments) #container,
#content:has(.assessmentsWrapper) #container {
  background-attachment: scroll !important;
}

body:has(#main > .course),
body:has(#main > .assessments),
body:has(.assessmentsWrapper) {
  background-attachment: scroll !important;
}
`.trim();

/**
 * Representative SEQTA response shapes captured from a real `/seqta/student/`
 * session via the websiteskimmer recorder. These are static fixtures used
 * by `selfTests.ts` to verify our extractors and the passive observer
 * remain compatible with the upstream API as it evolves.
 *
 * NOTE: These fixtures are scrubbed of any secrets and reduced in size; the
 * structure (keys, types, nesting) faithfully matches what SEQTA returns
 * but the values are illustrative rather than real student data.
 */

export const subjectsListPayload = [
  {
    code: "2026S1",
    description: "Sample Semester 1 timetable",
    active: 1,
    id: 77,
    subjects: [
      {
        code: "ENGG1",
        classunit: 29248,
        description: "English GEN 1",
        metaclass: 29611,
        title: "English GEN 1",
        programme: 3830,
        marksbook_type: "numeric",
      },
      {
        code: "MASA1",
        classunit: 29247,
        description: "Mathematics Specialist 1",
        metaclass: 29610,
        title: "Mathematics Specialist 1",
        programme: 3831,
        marksbook_type: "numeric",
      },
    ],
  },
];

export const coursesPayload = {
  c: "ENGG1#1",
  t: "English GEN 1",
  i: 3830,
  m: 29611,
  document:
    '{"document":{"modules":[{"uuid":"1641cf87-ae08-4bcb-832d-d5709d84d0c5"}]}}',
  w: [
    [
      { t: "", h: "", i: 248293, l: "", n: 0, o: "" },
      {
        t: "",
        i: 248316,
        l: '<p><a href="http://ed.ted.com/on/r80lnJL0#watch">http://ed.ted.com/on/r80lnJL0#watch</a></p>',
        n: 1,
        o: "",
      },
    ],
    [{ t: "Lesson 2", h: "<h1>Module 2</h1>", i: 248294, l: "", n: 0, o: "" }],
  ],
};

export const messagesListPayload = {
  hasMore: false,
  messages: [
    {
      date: "2026-04-29 04:26:25.075868+00",
      attachments: false,
      read: 1,
      sender: "Jacob Johannesburg",
      subject: "test",
      sender_type: "student",
      attachmentCount: 0,
      id: 81469,
      sender_id: 3111,
    },
  ],
  ts: "2026-04-30 03:25:02.27900",
};

export const documentsPayload = [
  {
    docs: [
      {
        file: 49555,
        filename: "School Glossary.docx",
        size: "14931",
        context_uuid: "3162189c-2052-4f83-ad83-a66c57460ea2",
        mimetype:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        created_date: "2021-08-04 12:55:55.102653+00",
        title: "School Glossary",
        uuid: "3162189c-2052-4f83-ad83-a66c57460ea2",
        created_by: "537",
      },
    ],
    id: 9,
    category: "Document repository",
  },
];

export const noticesPayload = [
  {
    id: 12345,
    title: "Lunchtime sport tomorrow",
    contents: "<p>Bring shoes.</p>",
    staff: "Mr Coach",
    staff_id: 246,
    label: 9,
    label_title: "All Students",
    colour: "#ff5722",
  },
];

export const portalsPayload = [
  {
    is_power_portal: false,
    inherit_styles: true,
    icon: "colour-cerulean",
    id: 328,
    label: "Mathletics",
    priority: 20,
    uuid: "9d20f40c-fdc9-4aa3-91f1-905d86e240c4",
    url: "www.mathletics.com/",
  },
];

export const folioListPayload = {
  me: "Jacob Johannesburg",
  list: [
    {
      student: "Jacob Johannesburg",
      id: 203,
      published: "2026-04-14 20:02:50",
      title: "My folio",
    },
  ],
};

export const folioEntryPayload = {
  forum: 478,
  contents:
    '[[embed:raw|<p>Some <strong>reflection</strong> text.</p>]] Plain trailing text.',
  created: "2026-04-14 10:32:34.264641+00",
  allow_comments: true,
  author: { year: "Year 10", name: "Jacob Johannesburg", id: 3111 },
  files: [],
  id: 203,
  published: "2026-04-14 20:02:50",
  title: "My folio",
  updated: "2026-04-14 10:32:50.696678+00",
};

/**
 * Settings payload contains tenant-wide configuration including third-party
 * URLs and API keys. The passive observer must NEVER index this route.
 */
export const settingsPayload = {
  "global.dropbox.api.key": { value: "xxx-do-not-index" },
  "global.ai.api.baseurl": { value: "https://example.com" },
};

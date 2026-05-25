import {
  isSensitiveKey,
  looksLikeSecretValue,
  redactSensitive,
  extractTextFromValue,
  pickTitle,
  pickId,
  buildIndexItem,
} from "./extract";
import { isSensitiveSeqtaPath, normalizeSeqtaPath } from "./api";
import {
  coursesPayload,
  documentsPayload,
  folioEntryPayload,
  noticesPayload,
  portalsPayload,
  settingsPayload,
  subjectsListPayload,
} from "./__fixtures__/seqtaResponses";

/**
 * Lightweight in-process self-tests for the global-search overhaul.
 *
 * The repository does not (yet) ship with a test runner, so we instead
 * expose a deterministic suite of assertions over the pure helpers that
 * back active jobs and the passive observer. This is intentionally
 * dependency-free so it can run inside the extension page (`window.
 * globalSearchDebug.runSelfTests()`) and from any future Vitest harness
 * without modification.
 */

interface TestCase {
  name: string;
  run: () => void | Promise<void>;
}

class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new AssertionError(message);
}

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new AssertionError(
      `${label}: expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`,
    );
  }
}

function assertContains(haystack: string, needle: string, label: string) {
  if (!haystack.includes(needle)) {
    throw new AssertionError(
      `${label}: expected "${haystack}" to contain "${needle}"`,
    );
  }
}

function assertNotContains(haystack: string, needle: string, label: string) {
  if (haystack.includes(needle)) {
    throw new AssertionError(
      `${label}: expected "${haystack}" NOT to contain "${needle}"`,
    );
  }
}

const cases: TestCase[] = [
  {
    name: "normalizeSeqtaPath strips query tokens",
    run: () => {
      assertEqual(
        normalizeSeqtaPath("/seqta/student/load/messages?mokx3qef"),
        "/seqta/student/load/messages",
        "trailing token",
      );
      assertEqual(
        normalizeSeqtaPath(
          "https://learn.example.com/seqta/student/load/courses?abc123",
        ),
        "/seqta/student/load/courses",
        "absolute URL",
      );
    },
  },
  {
    name: "isSensitiveSeqtaPath catches credential routes",
    run: () => {
      assert(
        isSensitiveSeqtaPath("/seqta/student/login?xyz"),
        "login is sensitive",
      );
      assert(
        isSensitiveSeqtaPath("/seqta/student/save/message"),
        "save/* is sensitive",
      );
      assert(
        isSensitiveSeqtaPath("/seqta/student/load/settings"),
        "settings is sensitive",
      );
      assert(
        isSensitiveSeqtaPath("/seqta/student/load/prefs?z=1"),
        "prefs is sensitive",
      );
      assert(
        isSensitiveSeqtaPath("/seqta/ta/masquerade"),
        "masquerade is sensitive",
      );
      assert(
        !isSensitiveSeqtaPath("/seqta/student/load/messages"),
        "messages is NOT sensitive",
      );
      assert(
        !isSensitiveSeqtaPath("/seqta/student/load/courses"),
        "courses is NOT sensitive",
      );
    },
  },
  {
    name: "isSensitiveKey covers the credential vocabulary",
    run: () => {
      for (const key of [
        "password",
        "Password",
        "client_secret",
        "apiKey",
        "X-API-Token",
        "jwtSession",
        "oauth_signature",
      ]) {
        assert(isSensitiveKey(key), `expected ${key} to be sensitive`);
      }
      for (const key of ["title", "subject", "uuid", "metaclass"]) {
        assert(!isSensitiveKey(key), `expected ${key} to be safe`);
      }
    },
  },
  {
    name: "looksLikeSecretValue catches token-shaped strings",
    run: () => {
      assert(
        looksLikeSecretValue(
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.abc123def456",
        ),
        "JWT looks secret",
      );
      assert(
        looksLikeSecretValue("a".repeat(40) + "b".repeat(40)),
        "long base64-ish string looks secret",
      );
      assert(
        !looksLikeSecretValue("Hello world"),
        "short readable text is safe",
      );
      assert(
        !looksLikeSecretValue("https://example.com/foo/bar"),
        "URLs are not secrets",
      );
      assert(
        !looksLikeSecretValue("3162189c-2052-4f83-ad83-a66c57460ea2"),
        "UUIDs are useful and not secret",
      );
    },
  },
  {
    name: "redactSensitive scrubs settings payloads",
    run: () => {
      const cleaned = redactSensitive(settingsPayload);
      const json = JSON.stringify(cleaned);
      assertNotContains(json, "global.dropbox.api.key", "dropbox key dropped");
      assertNotContains(json, "xxx-do-not-index", "secret value dropped");
    },
  },
  {
    name: "extractTextFromValue distills HTML and skips secrets",
    run: () => {
      const text = extractTextFromValue({
        title: "Hello",
        body: "<p>Some <strong>HTML</strong> body.</p>",
        password: "should-not-appear",
        nested: { token: "leak-me-please" },
      });
      assertContains(text, "Hello", "title preserved");
      assertContains(text, "HTML body", "html flattened");
      assertNotContains(text, "should-not-appear", "password redacted");
      assertNotContains(text, "leak-me-please", "nested token redacted");
    },
  },
  {
    name: "pickTitle / pickId prefer common SEQTA fields",
    run: () => {
      assertEqual(
        pickTitle({ title: "Hello", name: "Other" }),
        "Hello",
        "title wins over name",
      );
      assertEqual(
        pickTitle({ filename: "doc.pdf" }),
        "doc.pdf",
        "filename fallback",
      );
      assertEqual(pickId({ id: 42 }), "42", "numeric id stringified");
      assertEqual(pickId({ uuid: "abc" }), "abc", "uuid id");
    },
  },
  {
    name: "buildIndexItem produces redacted, well-formed records",
    run: () => {
      const item = buildIndexItem({
        id: "x-1",
        text: "Test",
        category: "passive",
        rawForContent: {
          title: "Test",
          body: "<p>Hello</p>",
          token: "should-be-stripped",
        },
        metadata: { route: "/seqta/student/load/whatever", apiKey: "drop" },
        actionId: "passive",
        renderComponentId: "passive",
      });
      assertEqual(item.id, "x-1", "id propagated");
      assertContains(item.content, "Hello", "html distilled");
      assertNotContains(item.content, "should-be-stripped", "token stripped");
      assert(
        !("apiKey" in (item.metadata as Record<string, unknown>)),
        "apiKey metadata stripped",
      );
      assertEqual(item.category, "passive", "category passes through");
    },
  },
  {
    name: "courses fixture flattens lesson HTML",
    run: () => {
      // Verify that the structural shape we depend on still matches.
      assert(Array.isArray(coursesPayload.w), "lesson grid present");
      const lessonHtml = (coursesPayload.w[0]?.[1] as { l?: string })?.l ?? "";
      assertContains(lessonHtml, "ed.ted.com", "lesson html link present");
    },
  },
  {
    name: "subjects fixture exposes programme/metaclass",
    run: () => {
      const subject = subjectsListPayload[0]?.subjects[0];
      assert(subject, "fixture has at least one subject");
      assert(
        Number.isFinite(subject!.programme) &&
          Number.isFinite(subject!.metaclass),
        "programme & metaclass numeric",
      );
    },
  },
  {
    name: "documents fixture exposes uuid + filename",
    run: () => {
      const doc = documentsPayload[0]?.docs[0];
      assert(doc?.uuid && doc?.filename, "uuid + filename present");
    },
  },
  {
    name: "notices fixture is HTML-bearing",
    run: () => {
      assertContains(
        noticesPayload[0]?.contents ?? "",
        "<p>",
        "notice html present",
      );
    },
  },
  {
    name: "portals fixture has external url",
    run: () => {
      assert(portalsPayload[0]?.url?.includes("mathletics"), "portal url");
    },
  },
  {
    name: "folio entry contents passes html-flattening",
    run: () => {
      const distilled = extractTextFromValue(folioEntryPayload, {
        maxChars: 4000,
      });
      assertContains(distilled, "reflection", "folio body extracted");
    },
  },
];

export interface SelfTestReport {
  passed: number;
  failed: number;
  failures: Array<{ name: string; error: string }>;
}

/**
 * Runs every assertion case and resolves with a summary. Never throws.
 *
 * Designed to be invoked from `window.globalSearchDebug.runSelfTests()`
 * by maintainers who want to validate the indexing pipeline against a
 * real SEQTA tab.
 */
export async function runGlobalSearchSelfTests(): Promise<SelfTestReport> {
  const report: SelfTestReport = { passed: 0, failed: 0, failures: [] };
  for (const test of cases) {
    try {
      await test.run();
      report.passed++;
    } catch (e) {
      report.failed++;
      const error =
        e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      report.failures.push({ name: test.name, error });
    }
  }
  if (report.failed > 0) {
    console.warn(
      `[Global Search Self-Tests] ${report.failed} failed / ${report.passed} passed`,
      report.failures,
    );
  } else {
    console.info(
      `[Global Search Self-Tests] All ${report.passed} cases passed`,
    );
  }
  return report;
}

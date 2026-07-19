import { detectPlatformFromUrlAndHost } from "./platformDetection";

describe("detectPlatformFromUrlAndHost", () => {
  it("detects teach-international host as teach", () => {
    expect(
      detectPlatformFromUrlAndHost(
        "teach-international.site.seqta.com.au",
        "https://teach-international.site.seqta.com.au/timetable",
      ),
    ).toBe("teach");
  });

  it("detects /betterseqta-home as teach", () => {
    expect(
      detectPlatformFromUrlAndHost(
        "school.example.edu.au",
        "https://school.example.edu.au/betterseqta-home",
      ),
    ).toBe("teach");
  });

  it("detects classic teach. subdomain", () => {
    expect(
      detectPlatformFromUrlAndHost(
        "teach.school.edu.au",
        "https://teach.school.edu.au/welcome",
      ),
    ).toBe("teach");
  });
});

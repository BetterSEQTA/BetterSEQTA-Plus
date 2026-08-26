import {
  buildSeqtaLoginBody,
  parseSeqtaLoginResponse,
  resolveSeqtaLoginRole,
  seqtaLoginEndpoint,
  submitSeqtaLogin,
} from "./seqtaLoginApi";

describe("resolveSeqtaLoginRole", () => {
  it("uses parent for Engage", () => {
    expect(resolveSeqtaLoginRole({ isEngage: true })).toBe("parent");
  });

  it("uses parent when URL mentions parent", () => {
    expect(
      resolveSeqtaLoginRole({
        isEngage: false,
        pathname: "/seqta/parent/home",
      }),
    ).toBe("parent");
  });

  it("defaults to student for Learn", () => {
    expect(
      resolveSeqtaLoginRole({
        isEngage: false,
        pathname: "/seqta/student/home",
      }),
    ).toBe("student");
  });
});

describe("seqtaLoginEndpoint", () => {
  it("maps roles to API paths", () => {
    expect(seqtaLoginEndpoint("student")).toBe("/seqta/student/login");
    expect(seqtaLoginEndpoint("parent")).toBe("/seqta/parent/login");
  });
});

describe("buildSeqtaLoginBody", () => {
  it("includes credentials and redirect", () => {
    expect(
      buildSeqtaLoginBody(
        { username: " alice ", password: "secret" },
        "https://learn.example.edu.au",
      ),
    ).toEqual({
      mode: "normal",
      query: null,
      redirect_url: "https://learn.example.edu.au",
      username: "alice",
      password: "secret",
    });
  });
});

describe("parseSeqtaLoginResponse", () => {
  it("accepts string and numeric 200 statuses", () => {
    expect(parseSeqtaLoginResponse({ status: "200", payload: { id: 1 } })).toEqual({
      success: true,
      payload: { id: 1 },
    });
    expect(parseSeqtaLoginResponse({ status: 200, payload: { id: 2 } })).toEqual({
      success: true,
      payload: { id: 2 },
    });
  });

  it("surfaces payload error messages", () => {
    expect(
      parseSeqtaLoginResponse({
        status: "401",
        payload: { message: "Bad credentials" },
      }),
    ).toEqual({ success: false, error: "Bad credentials" });
  });

  it("falls back to a generic message", () => {
    expect(parseSeqtaLoginResponse({ status: "403" })).toEqual({
      success: false,
      error: "Invalid username or password",
    });
  });
});

describe("submitSeqtaLogin", () => {
  it("posts credentials to the resolved endpoint", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "200", payload: { userName: "alice" } }),
    });

    const result = await submitSeqtaLogin(
      { username: "alice", password: "secret" },
      {
        role: "student",
        origin: "https://learn.example.edu.au",
        redirectUrl: "https://learn.example.edu.au",
        fetchImpl,
      },
    );

    expect(result).toEqual({ success: true, payload: { userName: "alice" } });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://learn.example.edu.au/seqta/student/login",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          mode: "normal",
          query: null,
          redirect_url: "https://learn.example.edu.au",
          username: "alice",
          password: "secret",
        }),
      }),
    );
  });

  it("returns HTTP errors without parsing JSON", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ status: "500" }),
    });

    const result = await submitSeqtaLogin(
      { username: "alice", password: "secret" },
      { role: "parent", origin: "https://engage.example.edu.au", fetchImpl },
    );

    expect(result).toEqual({
      success: false,
      error: "Login failed (HTTP 500)",
    });
  });
});

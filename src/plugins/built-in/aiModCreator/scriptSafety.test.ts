import { assertAdvancedScriptSafe } from "./scriptSafety";

describe("advanced AI mod script safeguards", () => {
  it("allows advanced DOM code with cleanup", () => {
    expect(() =>
      assertAdvancedScriptSafe(`
        const cards = bsplus.selectAll(":scope .card");
        for (const card of cards) {
          bsplus.setStyle(card, "border-radius", "16px");
          bsplus.on(card, "click", () => card.classList.toggle("expanded"));
        }
        const observer = bsplus.observe(root, () => console.info("changed"));
        return () => observer.disconnect();
      `),
    ).not.toThrow();
  });

  it("allows clearing containers with empty innerHTML during DOM moves", () => {
    expect(() =>
      assertAdvancedScriptSafe(`
        const wrapper = bsplus.select(".search-trigger-wrapper");
        wrapper.innerHTML = '';
        wrapper.appendChild(anchor);
        return () => {};
      `),
    ).not.toThrow();
  });

  it.each([
    ["network requests", `fetch("https://attacker.invalid")`],
    ["extension APIs", `chrome.storage.local.get(null)`],
    ["page storage", `localStorage.getItem("token")`],
    ["cookies", `document.cookie`],
    ["dynamic evaluation", `eval("alert(1)")`],
    ["script injection", `element.innerHTML = "<script>alert(1)</script>"`],
    ["non-empty innerHTML", `wrapper.innerHTML = "<div></div>"`],
    ["innerHTML append", `wrapper.innerHTML += "<span></span>"`],
    ["navigation", `location.href = "https://attacker.invalid"`],
    ["unbounded loops", `while (true) {}`],
  ])("rejects %s", (_label, script) => {
    expect(() => assertAdvancedScriptSafe(script)).toThrow();
  });
});

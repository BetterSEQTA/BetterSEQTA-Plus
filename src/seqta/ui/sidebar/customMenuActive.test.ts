/**
 * @jest-environment jsdom
 */
import {
  applyCustomMenuActive,
  scheduleRestoreCustomMenuActive,
} from "./customMenuActive";

describe("applyCustomMenuActive", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <ul id="bsplus-sidebar-root" class="drilling">
        <li class="item hasChildren" data-key="assessments">
          <label><span>Assessments</span></label>
          <div class="sub">
            <div class="nav"><div class="back"><div class="backLabel">Assessments</div></div></div>
            <ul>
              <li class="item" data-key="4804:11066" aria-current="page">
                <label><span>English</span></label>
              </li>
            </ul>
          </div>
        </li>
      </ul>
    `;
  });

  it("restores .active and .bsplus-active after SEQTA strips them", () => {
    applyCustomMenuActive({
      activeKey: "4804:11066",
      drilling: true,
    });

    const folder = document.querySelector(
      "#bsplus-sidebar-root > li.hasChildren",
    );
    const leaf = document.querySelector('li.item[data-key="4804:11066"]');

    expect(folder?.classList.contains("active")).toBe(true);
    expect(folder?.classList.contains("bsplus-active")).toBe(true);
    expect(leaf?.classList.contains("active")).toBe(true);
    expect(leaf?.classList.contains("bsplus-active")).toBe(true);
  });
});

describe("scheduleRestoreCustomMenuActive", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      });
    document.body.innerHTML = `
      <ul id="bsplus-sidebar-root" class="drilling">
        <li class="item hasChildren" data-key="assessments">
          <div class="sub"><ul>
            <li class="item" data-key="upcoming" aria-current="page"></li>
          </ul></div>
        </li>
      </ul>
    `;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("re-applies active classes after SEQTA strips them on the next frames", () => {
    const folder = document.querySelector(
      "#bsplus-sidebar-root > li.hasChildren",
    ) as HTMLElement;

    scheduleRestoreCustomMenuActive({
      activeKey: "upcoming",
      drilling: true,
    });

    folder.classList.remove("active", "bsplus-active");
    jest.advanceTimersByTime(50);

    expect(folder.classList.contains("active")).toBe(true);
    expect(folder.classList.contains("bsplus-active")).toBe(true);
  });
});

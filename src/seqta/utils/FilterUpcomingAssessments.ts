import { CreateElement } from "@/seqta/utils/CreateEnable/CreateElement";

export function FilterUpcomingAssessments(subjectoptions: any) {
  for (var item in subjectoptions) {
    let subjectdivs = document.querySelectorAll(`[data-subject="${item}"]`);

    for (let i = 0; i < subjectdivs.length; i++) {
      const element = subjectdivs[i];

      if (!subjectoptions[item]) {
        element.classList.add("hidden");
      }
      if (subjectoptions[item]) {
        element.classList.remove("hidden");
      }
      (element.parentNode! as HTMLElement).classList.remove("hidden");

      let children = element.parentNode!.parentNode!.children;
      for (let i = 0; i < children.length; i++) {
        const element = children[i];
        if (element.hasAttribute("data-hidden")) {
          element.remove();
        }
      }

      if (
        element.parentNode!.children.length ==
        element.parentNode!.querySelectorAll(".hidden").length
      ) {
        if (element.parentNode!.querySelectorAll(".hidden").length > 0) {
          if (
            !(element.parentNode!.parentNode! as HTMLElement).hasAttribute(
              "data-day",
            )
          ) {
            (element.parentNode!.parentNode! as HTMLElement).classList.add(
              "hidden",
            );
          } else {
            AddPlaceHolderToParent(
              element.parentNode!.parentNode,
              element.parentNode!.querySelectorAll(".hidden").length,
            );
          }
        }
      } else {
        (element.parentNode!.parentNode! as HTMLElement).classList.remove(
          "hidden",
        );
      }
    }
  }
}

function AddPlaceHolderToParent(parent: any, numberofassessments: any) {
  let textcontainer = CreateElement("div", "upcoming-blank");
  let textblank = CreateElement("p", "upcoming-hiddenassessment");
  let s = "";
  if (numberofassessments > 1) {
    s = "s";
  }
  textblank.innerText = `${numberofassessments} hidden assessment${s} due`;
  textcontainer.append(textblank);
  textcontainer.setAttribute("data-hidden", "true");

  parent.append(textcontainer);
}

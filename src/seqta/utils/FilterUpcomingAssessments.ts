import { CreateElement } from "@/seqta/utils/CreateEnable/CreateElement";

// Filters the upcoming assessments based on the provided subject options
export function FilterUpcomingAssessments(subjectoptions: any) {
  // Loop through each subject in the subjectoptions object
  for (var item in subjectoptions) {
    // Select all elements with a matching data-subject attribute
    let subjectdivs = document.querySelectorAll(`[data-subject="${item}"]`);

    // Loop through each subject element found
    for (let i = 0; i < subjectdivs.length; i++) {
      const element = subjectdivs[i];

      // If the subject is disabled (false), hide the element
      if (!subjectoptions[item]) {
        element.classList.add("hidden");
      }
      // If the subject is enabled (true), show the element
      if (subjectoptions[item]) {
        element.classList.remove("hidden");
      }
      // Ensure the parent container is visible
      (element.parentNode! as HTMLElement).classList.remove("hidden");

      // Loop through all children of the parent element
      let children = element.parentNode!.parentNode!.children;
      for (let i = 0; i < children.length; i++) {
        const element = children[i];
        // Remove any children with the 'data-hidden' attribute
        if (element.hasAttribute("data-hidden")) {
          element.remove();
        }
      }

      // Check if all children of the parent are hidden
      if (
        element.parentNode!.children.length ==
        element.parentNode!.querySelectorAll(".hidden").length
      ) {
        // If there are hidden children, handle the placeholder or visibility of the parent
        if (element.parentNode!.querySelectorAll(".hidden").length > 0) {
          // If the parent doesn't have a 'data-day' attribute, hide it
          if (
            !(element.parentNode!.parentNode! as HTMLElement).hasAttribute(
              "data-day",
            )
          ) {
            (element.parentNode!.parentNode! as HTMLElement).classList.add(
              "hidden",
            );
          } else {
            // If the parent has a 'data-day' attribute, add a placeholder for hidden assessments
            AddPlaceHolderToParent(
              element.parentNode!.parentNode,
              element.parentNode!.querySelectorAll(".hidden").length,
            );
          }
        }
      } else {
        // If not all children are hidden, make the parent visible
        (element.parentNode!.parentNode! as HTMLElement).classList.remove(
          "hidden",
        );
      }
    }
  }
}

// Adds a placeholder to the parent when assessments are hidden
function AddPlaceHolderToParent(parent: any, numberofassessments: any) {
  // Create a new div element for the placeholder
  let textcontainer = CreateElement("div", "upcoming-blank");
  // Create a paragraph element for the placeholder text
  let textblank = CreateElement("p", "upcoming-hiddenassessment");
  let s = "";
  // If more than one hidden assessment, append 's' to make it plural
  if (numberofassessments > 1) {
    s = "s";
  }
  // Set the text of the placeholder paragraph
  textblank.innerText = `${numberofassessments} hidden assessment${s} due`;
  // Append the paragraph to the container div
  textcontainer.append(textblank);
  // Mark the container div as hidden
  textcontainer.setAttribute("data-hidden", "true");

  // Append the placeholder to the parent
  parent.append(textcontainer);
}

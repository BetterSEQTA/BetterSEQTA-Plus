import renderSvelte from "@/interface/main";
import AssessmentsOverview from "./AssessmentsOverview.svelte";
import SkeletonLoader from "./SkeletonLoader.svelte";
import ErrorState from "./ErrorState.svelte";
import { unmount } from "svelte";

let currentApp: any = null;

export function renderGrid(container: HTMLElement, data: any) {
  if (currentApp) {
    unmount(currentApp);
  }
  
  container.innerHTML = "";
  container.className = "";
  
  currentApp = renderSvelte(AssessmentsOverview, container, { data });
}

export function renderSkeletonLoader(container: HTMLElement) {
  if (currentApp) {
    unmount(currentApp);
  }
  
  container.innerHTML = "";
  container.className = "";
  
  currentApp = renderSvelte(SkeletonLoader, container);
}


export function renderLoadingState(container: HTMLElement) {
  renderSkeletonLoader(container);
}

export function renderErrorState(container: HTMLElement, error: string) {
  if (currentApp) {
    unmount(currentApp);
  }
  
  container.innerHTML = "";
  container.className = "";
  
  currentApp = renderSvelte(ErrorState, container, { error });
}
// Device-local preferences (localStorage, same as the API key).

const STAGED_MOVE_KEY = "settlein-staged-move";

/**
 * "Moving in stages" mode: the family has both homes for a while, so items
 * split into Move Now (first load to the new place) and Keep (waits at this
 * house until it sells). Defaults to on; Settings can turn it off for a
 * simpler single-move experience.
 */
export function stagedMoveEnabled(): boolean {
  return localStorage.getItem(STAGED_MOVE_KEY) !== "off";
}

export function setStagedMove(on: boolean): void {
  localStorage.setItem(STAGED_MOVE_KEY, on ? "on" : "off");
}

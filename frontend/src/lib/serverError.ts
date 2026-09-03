// Lets any fetch call in the app (lib/*.ts, outside React) signal a 5xx
// response to the single app-wide ServerErrorModal mounted in App.tsx,
// without importing React or threading callbacks through every lib module.
export interface ServerErrorListener {
  onServerError(): void;
}

let listener: ServerErrorListener | null = null;

export function registerServerErrorListener(
  next: ServerErrorListener | null,
): void {
  listener = next;
}

export function reportServerError(): void {
  listener?.onServerError();
}

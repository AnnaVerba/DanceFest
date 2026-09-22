export interface AuthorizedFetchOptions {
  // A call the page can do without. On a session that cannot be refreshed
  // the 401 comes back to the caller instead of clearing the session and
  // navigating to /login — a page a logged-out visitor may read must not
  // cost a visitor with a stale token the page they opened.
  optional?: boolean;
}

/** Frontend routes, mirroring frontend/src/App.tsx. Kept in one place so a route rename only needs one edit. */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  COACH: '/coach',
  ADMINS: '/admins',
  NEW_COMPETITION: '/competitions/new',
  COMPETITION_PREVIEW: '/competitions/preview',
  CATEGORY_TEMPLATES: '/category-templates',
  CATEGORY_TEMPLATE_NEW: '/category-templates/new',
  UNKNOWN_ROUTE_PROBE: '/this-route-does-not-exist-e2e-probe',
  competitionDetail: (id: string) => `/competitions/${id}`,
  competitionApply: (id: string) => `/competitions/${id}/apply`,
  competitionEdit: (id: string) => `/competitions/${id}/edit`,
  competitionTeam: (id: string) => `/competitions/${id}/team`,
} as const;

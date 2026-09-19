export const PROGRAM_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
} as const;

export type ProgramStatus =
  (typeof PROGRAM_STATUS)[keyof typeof PROGRAM_STATUS];

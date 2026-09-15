import type { AwardLineKind } from './award-line-kind';

export interface AwardLine {
  // Stable id of the line; overrides are stored under it.
  key: string;
  kind: AwardLineKind;
  // Cup lineup label or special nomination name; null for single lines.
  subject: string | null;
  calculated: number;
  override: number | null;
}

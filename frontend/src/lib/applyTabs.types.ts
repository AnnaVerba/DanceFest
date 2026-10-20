import type { APPLY_TAB } from './applyTabs.constants';

export type ApplyTab = (typeof APPLY_TAB)[keyof typeof APPLY_TAB];

// Which sections of the program are collapsed. "Collapse all" flips the
// default, so it also covers sections on pages not loaded yet; `toggled`
// holds the sections the user opened or closed against that default.
export interface SectionCollapse {
  collapsedByDefault: boolean;
  toggled: ReadonlySet<string>;
}

// Hands one already-persisted ExportJob row off to whatever actually builds
// its archive. Implementations: BullMqExportDispatcher (worker mode),
// CloudRunJobExportDispatcher (cloud-run-job mode).
export interface ExportDispatcher {
  dispatch(exportJobId: string): Promise<void>;
}

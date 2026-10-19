import { useState } from 'react';
import { getExtendedProgram } from '../../../lib/program';
import type { CompetitionDay } from '../../../lib/schedule';
import type { Venue } from '../../../lib/venues';
import { buildProgramSheetRows, downloadProgramExcel } from './programExcel';
import {
  PROGRAM_EXPORT_BUSY_LABEL,
  PROGRAM_EXPORT_ERROR,
  PROGRAM_EXPORT_LABEL,
  PROGRAM_EXPORT_TITLE,
} from './programExcel.constants';
import styles from './program.module.css';

interface ProgramExcelButtonProps {
  competitionId: string;
  competitionName: string;
  days: CompetitionDay[];
  venues: Venue[];
  onError: (message: string) => void;
}

// Downloads the whole live program — every day and venue — as .xlsx.
export default function ProgramExcelButton({
  competitionId,
  competitionName,
  days,
  venues,
  onError,
}: ProgramExcelButtonProps) {
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      const sections = await getExtendedProgram(competitionId);
      await downloadProgramExcel(
        buildProgramSheetRows(sections, days, venues),
        competitionName,
      );
    } catch {
      onError(PROGRAM_EXPORT_ERROR);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={styles.ghostBtn}
      title={PROGRAM_EXPORT_TITLE}
      disabled={busy}
      onClick={handleExport}
    >
      {busy ? PROGRAM_EXPORT_BUSY_LABEL : PROGRAM_EXPORT_LABEL}
    </button>
  );
}

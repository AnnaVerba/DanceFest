import { useState } from 'react';
import { downloadProgramExcel } from './programExcel';
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
  onError: (message: string) => void;
}

// Downloads the whole live program — every day and venue — as .xlsx, one
// sheet per section, laid out as the printed programme.
export default function ProgramExcelButton({
  competitionId,
  competitionName,
  onError,
}: ProgramExcelButtonProps) {
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      await downloadProgramExcel(competitionId, competitionName);
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

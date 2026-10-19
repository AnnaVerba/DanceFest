import { authorizedFetch } from '../../../lib/auth';
import { downloadBlob } from '../../../lib/downloadFile';
import {
  PROGRAM_EXCEL_PATH_SUFFIX,
  PROGRAM_FILE_EXTENSION,
  PROGRAM_FILE_NAME_PREFIX,
  PROGRAM_FILE_NAME_SEPARATOR,
} from './programExcel.constants';

// Downloads the live program as .xlsx. The server builds it — reading the
// program a few sections at a time and streaming the file — so the browser
// never holds the whole program, however big the competition.
export async function downloadProgramExcel(
  competitionId: string,
  competitionName: string,
): Promise<void> {
  const response = await authorizedFetch(
    `/competitions/${competitionId}${PROGRAM_EXCEL_PATH_SUFFIX}`,
  );
  if (!response.ok) throw new Error(response.statusText);
  downloadBlob(
    await response.blob(),
    `${PROGRAM_FILE_NAME_PREFIX}${PROGRAM_FILE_NAME_SEPARATOR}${competitionName}${PROGRAM_FILE_EXTENSION}`,
  );
}

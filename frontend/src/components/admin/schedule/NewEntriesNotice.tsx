import { pickPluralForm } from '../../../lib/plural';
import {
  NEW_ENTRIES_NOTICE_FORMS,
  NEW_ENTRIES_NOTICE_PREFIX,
} from './newEntriesNotice.constants';
import styles from './program.module.css';

interface NewEntriesNoticeProps {
  count: number;
}

// Entries that arrived after the program was formed and had no nomination
// block to join — they wait in «Нерозподілені виходи».
export default function NewEntriesNotice({ count }: NewEntriesNoticeProps) {
  return (
    <div className={styles.warnLine} role="status">
      {NEW_ENTRIES_NOTICE_PREFIX} {count}{' '}
      {pickPluralForm(count, NEW_ENTRIES_NOTICE_FORMS)}
    </div>
  );
}

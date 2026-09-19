import Pager from '../Pager';
import { PAGER_ARIA_LABEL } from './nominationFilters.constants';
import type { NominationSelection } from './nominationSelection.types';

interface NominationPagerProps {
  selection: NominationSelection;
  total: number;
}

export default function NominationPager({ selection, total }: NominationPagerProps) {
  const { page, pageSize } = selection.pageQuery;
  return (
    <Pager
      navigator={{ page, pageSize, total, goTo: selection.setPage }}
      ariaLabel={PAGER_ARIA_LABEL}
    />
  );
}

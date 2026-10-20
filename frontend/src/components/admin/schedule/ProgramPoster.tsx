import type { PublicProgramRow } from '../../../lib/program';
import type { CompetitionDay } from '../../../lib/schedule';
import type { Venue } from '../../../lib/venues';
import { opensProgram, programHeading } from '../../../lib/programHeading';
import { groupProgramSections } from '../../../lib/programSections';
import ProgramSectionBlock from '../../program/ProgramSectionBlock';
import { POSTER_NO_MARKS } from './programPoster.constants';
import styles from './Schedule.module.css';
import festivalStyles from '../../program/FestivalProgram.module.css';

interface ProgramPosterProps {
  rows: PublicProgramRow[];
  days?: CompetitionDay[];
  venues?: Venue[];
}

// The festival programme exactly as a viewer reads it (ProgramSectionBlock):
// one list of every section, each nomination with its clock time, a heading
// opening each day's program per venue.
export default function ProgramPoster({
  rows,
  days = [],
  venues = [],
}: ProgramPosterProps) {
  if (rows.length === 0) {
    return <p className={styles.empty}>Публічна програма ще порожня.</p>;
  }

  const venueNames = new Map(venues.map((venue) => [venue.id, venue.name]));
  const dayLabel = (row: PublicProgramRow) => {
    const day = days.find((d) => d.id === row.dayId);
    return day ? (day.label ?? day.date) : (row.dayDate ?? '');
  };
  const sections = groupProgramSections(rows);

  return (
    <div className={styles.card}>
      {sections.map((section, index) => (
        <div key={section.id}>
          {opensProgram(section.head, sections[index - 1]?.head) && (
            <h3 className={festivalStyles.dayHeading}>
              {programHeading(dayLabel(section.head), section.head.venueId, venueNames)}
            </h3>
          )}
          <ProgramSectionBlock section={section} marks={POSTER_NO_MARKS} />
        </div>
      ))}
    </div>
  );
}

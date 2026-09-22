import { useState } from 'react';
import type { MineProgramSection } from '../../lib/program';
import { formatMarkedParticipantNumbers } from '../../lib/participantNumbers';
import { formatClock } from '../../lib/duration';
import {
  CHEVRON_COLLAPSED,
  CHEVRON_EXPANDED,
  GROUP_PERFORMER_SEPARATOR,
  LABEL_SEPARATOR,
  MY_PERFORMANCE_TAG,
  MY_PERFORMANCES_LABEL,
  MY_PROGRAM_TITLE,
  MY_STUDENT_TAG,
  MY_STUDENTS_LABEL,
  TOTALS_SEPARATOR,
} from './FestivalProgram.constants';
import styles from './FestivalProgram.module.css';

interface MyProgramBlockProps {
  sections: MineProgramSection[];
}

// "Ваша програма": a panel of its own above the full programme, where a
// dancer sees their own exits and a coach their students'. Every row carries
// a colour and a tag, so the highlight survives both themes and a
// black-and-white printout. The server sends only flagged exits, so a row is
// either mine or a student's.
export default function MyProgramBlock({ sections }: MyProgramBlockProps) {
  const [expanded, setExpanded] = useState(true);

  // Counted off what is on screen: the caller has already narrowed these
  // sections to the open venue tab and the search, so a server-wide total
  // would contradict the rows below it.
  const exits = sections.flatMap((section) => section.exits);
  const mineCount = exits.filter((exit) => exit.isMine).length;
  const studentCount = exits.length - mineCount;
  const counts = [
    mineCount > 0
      ? `${MY_PERFORMANCES_LABEL}${TOTALS_SEPARATOR}${mineCount}`
      : null,
    studentCount > 0
      ? `${MY_STUDENTS_LABEL}${TOTALS_SEPARATOR}${studentCount}`
      : null,
  ]
    .filter((count): count is string => count !== null)
    .join(LABEL_SEPARATOR);

  // Two 10:00 sections on different days look identical otherwise — the
  // same rule the full programme uses for its day headings.
  const showDayHeadings = new Set(sections.map((s) => s.dayId)).size > 1;

  return (
    <section className={styles.myProgram}>
      <button
        type="button"
        className={styles.myProgramToggle}
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        <span className={styles.chevron} aria-hidden="true">
          {expanded ? CHEVRON_EXPANDED : CHEVRON_COLLAPSED}
        </span>
        <span className={styles.myProgramTitle}>{MY_PROGRAM_TITLE}</span>
        <span className={styles.myProgramCounts}>{counts}</span>
      </button>

      {expanded && (
        <div className={styles.myProgramBody}>
          {sections.map((section, index) => {
            const newDay =
              index === 0 || sections[index - 1].dayId !== section.dayId;
            return (
              <div key={section.id} className={styles.section}>
                {showDayHeadings && newDay && section.dayDate && (
                  <h3 className={styles.dayHeading}>{section.dayDate}</h3>
                )}
                <div className={styles.sectionHead}>
                  <span className={styles.time}>
                    {formatClock(section.time)}
                  </span>
                  <h3 className={styles.sectionName}>{section.name}</h3>
                </div>
                {section.exits.map((exit) => (
                  <div
                    key={`${exit.number}-${exit.time}`}
                    className={`${styles.exitRow} ${
                      exit.isMine ? styles.exitMine : styles.exitStudent
                    }`}
                  >
                    <span className={styles.time}>{formatClock(exit.time)}</span>
                    <span className={styles.num}>
                      {formatMarkedParticipantNumbers(exit.participantNumbers)}
                    </span>
                    <span className={styles.grow}>
                      {exit.groupLabel
                        ? `${exit.groupLabel}${GROUP_PERFORMER_SEPARATOR}`
                        : ''}
                      {exit.performerName}
                    </span>
                    <span
                      className={
                        exit.isMine
                          ? styles.tag
                          : `${styles.tag} ${styles.tagStudent}`
                      }
                    >
                      {exit.isMine ? MY_PERFORMANCE_TAG : MY_STUDENT_TAG}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

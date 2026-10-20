import type {
  ExtendedProgramItem,
  ExtendedProgramSection,
} from '../schedule/program-view';
import {
  AWARD_ITEM,
  CLOCK_PAD,
  CLOCK_PART_LENGTH,
  CLOCK_SEPARATOR,
  EMPTY_CELL,
  HOURS_PER_DAY,
  NOMINATION_NUMBER_MARK,
  PARTICIPANT_NUMBERS_SEPARATOR,
  PARTICIPANT_NUMBER_PLACEHOLDER,
  PERFORMANCE_ITEM,
  PROGRAM_LINE_KIND,
  SERVICE_LABEL_SEPARATOR,
  SERVICE_ROW_LABELS,
  SHEET_NAME_DUPLICATE_CLOSE,
  SHEET_NAME_DUPLICATE_OPEN,
  SHEET_NAME_DUPLICATE_START,
  SHEET_NAME_FORBIDDEN,
  SHEET_NAME_MAX_LENGTH,
  SHEET_NAME_REPLACEMENT,
  SHEET_NAME_SEPARATOR,
  SHEET_TIME_RANGE_SEPARATOR,
  LEADER_ROLE_LABEL,
  LEADERS_SEPARATOR,
  TRAINER_ROLE_LABEL,
  VENUE_UNASSIGNED_LABEL,
} from './program-excel.constants';
import type {
  ProgramSheet,
  ProgramSheetLine,
  ProgramSheetPlaces,
} from './program-sheet.interface';

// "29:20:00" -> "05:20": a running time past midnight wraps to the clock.
function clock(time: string): string {
  const [hours, minutes] = time.split(CLOCK_SEPARATOR);
  const wrapped = String(Number(hours) % HOURS_PER_DAY).padStart(
    CLOCK_PART_LENGTH,
    CLOCK_PAD,
  );
  return `${wrapped}${CLOCK_SEPARATOR}${minutes}`;
}

// "Перерва", or "Перерва · Кава-брейк" for a break the organizer named; a
// name that only repeats the row's kind is not doubled.
function serviceLabel(item: ExtendedProgramItem): string {
  const base = SERVICE_ROW_LABELS[item.type];
  return item.groupLabel && item.groupLabel !== base
    ? `${base}${SERVICE_LABEL_SEPARATOR}${item.groupLabel}`
    : base;
}

// "7" for a solo, "7, 12, 15" for a group; a dancer with no number yet
// keeps a dash in place.
function participantNumbersOf(item: ExtendedProgramItem): string {
  if (item.participantNumbers.length === 0) {
    return PARTICIPANT_NUMBER_PLACEHOLDER;
  }
  return item.participantNumbers
    .map((n) => (n === null ? PARTICIPANT_NUMBER_PLACEHOLDER : String(n)))
    .join(PARTICIPANT_NUMBERS_SEPARATOR);
}

// "керівник Анна Бондар, тренер Марія Шевченко" — each named with their
// role; a head who trains the dancers themself is named once:
// "керівник, тренер Ольга Коваль".
function leadersOf(item: ExtendedProgramItem): string {
  const { choreographer: head, instructorName: trainer } = item;
  if (head && head === trainer) {
    return `${LEADER_ROLE_LABEL}${LEADERS_SEPARATOR}${TRAINER_ROLE_LABEL} ${head}`;
  }
  return [
    head ? `${LEADER_ROLE_LABEL} ${head}` : null,
    trainer ? `${TRAINER_ROLE_LABEL} ${trainer}` : null,
  ]
    .filter(Boolean)
    .join(LEADERS_SEPARATOR);
}

// A section's lines in running order. Nominations are numbered per section
// as the programmes number them: a new number whenever the group changes or
// a break / gala interrupts it.
function linesOf(section: ExtendedProgramSection): ProgramSheetLine[] {
  const lines: ProgramSheetLine[] = [];
  let runLabel: string | null = null;
  let categoryNumber = 0;
  for (const item of section.items) {
    if (item.type !== PERFORMANCE_ITEM) {
      if (item.type !== AWARD_ITEM) runLabel = null;
      lines.push({
        kind: PROGRAM_LINE_KIND.SERVICE,
        label: serviceLabel(item),
      });
      continue;
    }
    if (item.groupLabel !== runLabel) {
      runLabel = item.groupLabel;
      categoryNumber += 1;
      lines.push({
        kind: PROGRAM_LINE_KIND.NOMINATION,
        number: `${NOMINATION_NUMBER_MARK}${categoryNumber}`,
        name: item.groupLabel ?? EMPTY_CELL,
      });
    }
    lines.push({
      kind: PROGRAM_LINE_KIND.PERFORMER,
      participantNumbers: participantNumbersOf(item),
      performer: item.routineName ?? EMPTY_CELL,
      leaders: leadersOf(item),
    });
  }
  return lines;
}

// Turns program sections into sheets one at a time, keeping sheet names
// unique across the whole workbook.
export class ProgramSheetBuilder {
  private readonly takenNames = new Set<string>();

  constructor(private readonly places: ProgramSheetPlaces) {}

  // `endTime` ("HH:MM:SS") is when the section's last position finishes.
  build(section: ExtendedProgramSection, endTime: string): ProgramSheet {
    return {
      name: this.nameOf(section),
      title: section.name,
      timeRange: `${clock(section.time)}${SHEET_TIME_RANGE_SEPARATOR}${clock(endTime)}`,
      lines: linesOf(section),
    };
  }

  // "Майданчик А · Відділення 1"; with several days the day leads, so the
  // same section of two days stays apart.
  private nameOf(section: ExtendedProgramSection): string {
    const { dayLabels, venueNames } = this.places;
    const parts = [
      dayLabels?.get(section.dayId),
      venueNames
        ? (section.venueId && venueNames.get(section.venueId)) ||
          VENUE_UNASSIGNED_LABEL
        : null,
      section.name,
    ].filter(Boolean);
    return this.unique(
      parts
        .join(SHEET_NAME_SEPARATOR)
        .replace(SHEET_NAME_FORBIDDEN, SHEET_NAME_REPLACEMENT)
        .slice(0, SHEET_NAME_MAX_LENGTH),
    );
  }

  private unique(base: string): string {
    let name = base;
    for (
      let n = SHEET_NAME_DUPLICATE_START;
      this.takenNames.has(name);
      n += 1
    ) {
      const suffix = `${SHEET_NAME_DUPLICATE_OPEN}${n}${SHEET_NAME_DUPLICATE_CLOSE}`;
      name = `${base.slice(0, SHEET_NAME_MAX_LENGTH - suffix.length)}${suffix}`;
    }
    this.takenNames.add(name);
    return name;
  }
}

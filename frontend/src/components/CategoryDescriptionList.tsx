import type { NominationAxisValue } from '../lib/nominations.types';

interface CategoryDescriptionListProps {
  values: NominationAxisValue[];
  className: string;
}

// Пояснення обраних значень осі у формі заявки. Значення без опису мовчать.
export default function CategoryDescriptionList({
  values,
  className,
}: CategoryDescriptionListProps) {
  return (
    <>
      {values
        .filter((value) => value.description !== null)
        .map((value) => (
          <p key={value.id} className={className}>
            <strong>{value.name}</strong> — {value.description}
          </p>
        ))}
    </>
  );
}

import {
  ALL_MEDAL_LEAGUES_HINT,
  ALL_MEDAL_LEAGUES_TITLE,
  NO_LEAGUES_HINT,
} from './AllMedalLeaguesField.constants';
import styles from './AllMedalLeaguesField.module.css';

interface AllMedalLeaguesFieldProps {
  leagueNames: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

export default function AllMedalLeaguesField({
  leagueNames,
  selected,
  onChange,
  disabled = false,
}: AllMedalLeaguesFieldProps) {
  const toggle = (name: string, checked: boolean) =>
    onChange(
      checked ? [...selected, name] : selected.filter((s) => s !== name),
    );

  return (
    <>
      <p className={styles.title}>{ALL_MEDAL_LEAGUES_TITLE}</p>
      <p className={styles.hint}>
        {leagueNames.length === 0 ? NO_LEAGUES_HINT : ALL_MEDAL_LEAGUES_HINT}
      </p>
      {leagueNames.length > 0 && (
        <div className={styles.options}>
          {leagueNames.map((name) => (
            <label key={name} className={styles.option}>
              <input
                type="checkbox"
                checked={selected.includes(name)}
                disabled={disabled}
                onChange={(e) => toggle(name, e.target.checked)}
              />
              {name}
            </label>
          ))}
        </div>
      )}
    </>
  );
}

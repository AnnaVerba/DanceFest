import { useId } from 'react';
import {
  PROJECT_LOGO_GOLD_PATH,
  PROJECT_LOGO_GOLD_SHINE_PATH,
  PROJECT_LOGO_GOLD_SHINE_STOPS,
  PROJECT_LOGO_GOLD_SHINE_WIDTH,
  PROJECT_LOGO_GOLD_SPAN,
  PROJECT_LOGO_GOLD_STOPS,
  PROJECT_LOGO_PATH,
  PROJECT_LOGO_VIEW_BOX,
  SVG_ID_UNSAFE_CHARS,
} from './ProjectLogo.constants';

type ProjectLogoProps = {
  className?: string;
};

export default function ProjectLogo({ className }: ProjectLogoProps) {
  // Several logos can share a page (rail + hero), so the gradients need
  // unique ids. React's ids carry ':' / '«»', which break a `url(#…)`.
  const id = useId().replace(SVG_ID_UNSAFE_CHARS, '');
  const goldId = `logo-gold${id}`;
  const shineId = `logo-shine${id}`;

  return (
    <svg
      className={className}
      // Layout shared by every consumer. Size is deliberately absent: each
      // consumer sets its own through `className`, and an inline width/height
      // here would outrank all of them.
      style={{
        display: 'block',
        maxWidth: '100%',
        margin: '0 auto',
      }}
      viewBox={PROJECT_LOGO_VIEW_BOX}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={goldId}
          gradientUnits="userSpaceOnUse"
          {...PROJECT_LOGO_GOLD_SPAN}
        >
          {PROJECT_LOGO_GOLD_STOPS.map((stop) => (
            <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </linearGradient>
        <linearGradient
          id={shineId}
          gradientUnits="userSpaceOnUse"
          {...PROJECT_LOGO_GOLD_SPAN}
        >
          {PROJECT_LOGO_GOLD_SHINE_STOPS.map((stop) => (
            <stop
              key={stop.offset}
              offset={stop.offset}
              stopColor={stop.color}
              stopOpacity={stop.opacity}
            />
          ))}
        </linearGradient>
      </defs>
      <path d={PROJECT_LOGO_PATH} fill="currentColor" fillRule="evenodd" />
      <path d={PROJECT_LOGO_GOLD_PATH} fill={`url(#${goldId})`} />
      <path
        d={PROJECT_LOGO_GOLD_SHINE_PATH}
        fill="none"
        stroke={`url(#${shineId})`}
        strokeWidth={PROJECT_LOGO_GOLD_SHINE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

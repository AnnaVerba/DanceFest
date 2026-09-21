import { PROJECT_LOGO_PATH, PROJECT_LOGO_VIEW_BOX } from './ProjectLogo.constants';

type ProjectLogoProps = {
  className?: string;
};

export default function ProjectLogo({ className }: ProjectLogoProps) {
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
      <path d={PROJECT_LOGO_PATH} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

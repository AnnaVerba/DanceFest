import { PROJECT_LOGO_PATH, PROJECT_LOGO_VIEW_BOX } from './ProjectLogo.constants';

type ProjectLogoProps = {
  className?: string;
};

export default function ProjectLogo({ className }: ProjectLogoProps) {
  return (
    <svg
      className={className}
      style={{
        display: 'block',
        width: '30vw',
        maxWidth: '100%',
        height: 'auto',
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

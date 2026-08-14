import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getCompetitions } from '../lib/competitions';

export default function CompetitionPreviewRedirect() {
  const [targetId, setTargetId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getCompetitions()
      .then((data) => {
        if (!cancelled) setTargetId(data[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setTargetId(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (targetId === undefined) {
    return <p style={{ padding: 24 }}>Завантаження...</p>;
  }
  if (targetId === null) {
    return <p style={{ padding: 24 }}>Поки що немає жодного конкурсу для перегляду.</p>;
  }
  return <Navigate to={`/competitions/${targetId}`} replace />;
}

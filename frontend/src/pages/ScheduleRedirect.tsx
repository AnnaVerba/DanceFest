import { Navigate, useParams } from 'react-router-dom';

// The programme now lives on the competition page itself; old
// /competitions/:id/schedule links land there.
export default function ScheduleRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/competitions/${id}` : '/'} replace />;
}

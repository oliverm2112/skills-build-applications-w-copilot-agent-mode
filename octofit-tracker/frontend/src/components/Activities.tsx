import { getJson } from '../api/client.js';
import { useApiData } from '../hooks/useApiData.js';
import { CapabilityCard } from './CapabilityCard.js';

type Activity = { _id?: string; type: string; minutes: number; points: number };
type ActivitiesResponse = { activities: Activity[] };
const loadActivities = () => getJson<ActivitiesResponse>('/api/activities');

export default function Activities() {
  const state = useApiData(loadActivities);
  return (
    <CapabilityCard title="Activities" description="Track student activity minutes and points.">
      {state.status === 'loading' && <p role="status">Loading activities...</p>}
      {state.status === 'error' && <p role="alert">Unable to load activities: {state.message}</p>}
      {state.status === 'success' && (state.data.activities.length === 0
        ? <p>No activities yet.</p>
        : <ul>{state.data.activities.map((activity, index) => (
          <li key={activity._id ?? `${activity.type}-${index}`}>
            {activity.type} - {activity.minutes} minutes - {activity.points} points
          </li>
        ))}</ul>)}
    </CapabilityCard>
  );
}

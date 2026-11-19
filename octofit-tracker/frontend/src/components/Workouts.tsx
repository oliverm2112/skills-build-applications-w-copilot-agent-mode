import { getJson } from '../api/client.js';
import { useApiData } from '../hooks/useApiData.js';
import { CapabilityCard } from './CapabilityCard.js';

type Workout = { _id?: string; title: string; focus?: string; minutes?: number; difficulty?: string; reason?: string };
type WorkoutsResponse = { suggestions: Workout[] };
const suggestionPath = `/api/workouts/suggestions/${encodeURIComponent('mona@example.com')}`;
const loadSuggestions = () => getJson<WorkoutsResponse>(suggestionPath);

export default function Workouts() {
  const state = useApiData(loadSuggestions);
  return (
    <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns.">
      {state.status === 'loading' && <p role="status">Loading workout suggestions...</p>}
      {state.status === 'error' && <p role="alert">Unable to load workout suggestions: {state.message}</p>}
      {state.status === 'success' && (state.data.suggestions.length === 0
        ? <p>No workout suggestions yet.</p>
        : <ul>{state.data.suggestions.map((workout, index) => (
          <li key={workout._id ?? `${workout.title}-${index}`}>
            <strong>{workout.title}</strong>
            {workout.focus && ` - ${workout.focus}`}
            {workout.minutes !== undefined && ` - ${workout.minutes} minutes`}
            {workout.difficulty && ` - ${workout.difficulty}`}
            {workout.reason && <p>{workout.reason}</p>}
          </li>
        ))}</ul>)}
    </CapabilityCard>
  );
}

import { useApiData } from '../hooks/useApiData.js';
import { CapabilityCard } from './CapabilityCard.js';

type Team = { _id?: string; name: string; mascot?: string; members?: Array<string | { name?: string }> };
type TeamsResponse = { teams: Team[] };

export default function Teams() {
  const state = useApiData<TeamsResponse>('/api/teams');
  return (
    <CapabilityCard title="Teams" description="Manage teams and members.">
      {state.status === 'loading' && <p role="status">Loading teams...</p>}
      {state.status === 'error' && <p role="alert">Unable to load teams: {state.message}</p>}
      {state.status === 'success' && (state.data.teams.length === 0
        ? <p>No teams yet.</p>
        : <ul>{state.data.teams.map((team, index) => (
          <li key={team._id ?? `${team.name}-${index}`}>
            {team.name}{team.mascot ? ` - ${team.mascot}` : ''}
            {team.members && team.members.length > 0 && ` (${team.members.map((member) => typeof member === 'string' ? member : member.name ?? 'Member').join(', ')})`}
          </li>
        ))}</ul>)}
    </CapabilityCard>
  );
}

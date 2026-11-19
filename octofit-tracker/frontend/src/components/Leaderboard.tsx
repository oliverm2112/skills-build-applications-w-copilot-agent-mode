import { getJson } from '../api/client.js';
import { useApiData } from '../hooks/useApiData.js';
import { CapabilityCard } from './CapabilityCard.js';

type LeaderboardEntry = { teamName: string; totalPoints: number; rank: number };
type LeaderboardResponse = { leaderboard: LeaderboardEntry[] };
const loadLeaderboard = () => getJson<LeaderboardResponse>('/api/leaderboard');

export default function Leaderboard() {
  const state = useApiData(loadLeaderboard);
  return (
    <CapabilityCard title="Leaderboard" description="Compare team point totals.">
      {state.status === 'loading' && <p role="status">Loading leaderboard...</p>}
      {state.status === 'error' && <p role="alert">Unable to load leaderboard: {state.message}</p>}
      {state.status === 'success' && (state.data.leaderboard.length === 0
        ? <p>No leaderboard rankings yet.</p>
        : <ol>{state.data.leaderboard.map((entry) => (
          <li key={entry.rank}>{entry.teamName} - {entry.totalPoints} points</li>
        ))}</ol>)}
    </CapabilityCard>
  );
}

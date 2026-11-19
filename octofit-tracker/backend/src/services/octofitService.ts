import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

type HttpError = Error & { status: number };

function httpError(message: string, status: number): HttpError {
  return Object.assign(new Error(message), { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && mongoose.isValidObjectId(value);
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1 }).lean();
}

export async function createActivity(input: unknown) {
  if (!isRecord(input)) throw httpError('Activity details are required', 400);
  const { userId, teamId, type, minutes } = input;
  if (!isObjectId(userId) || !isObjectId(teamId)) {
    throw httpError('Valid userId and teamId are required', 400);
  }
  if (typeof type !== 'string' || !type.trim()) throw httpError('Activity type is required', 400);
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw httpError('Minutes must be a positive number', 400);
  }

  const [user, team] = await Promise.all([
    User.exists({ _id: userId }),
    Team.exists({ _id: teamId }),
  ]);
  if (!user || !team) throw httpError('The specified user or team does not exist', 404);

  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!isRecord(input)) throw httpError('Team details are required', 400);
  const { name, mascot } = input;
  const members = input.members ?? [];
  if (typeof name !== 'string' || !name.trim()) throw httpError('Team name is required', 400);
  if (typeof mascot !== 'string' || !mascot.trim()) throw httpError('Team mascot is required', 400);
  if (!Array.isArray(members) || !members.every(isObjectId)) {
    throw httpError('Members must be an array of valid user IDs', 400);
  }

  const memberIds = [...new Set(members)];
  if (memberIds.length > 0) {
    const existingMembers = await User.countDocuments({ _id: { $in: memberIds } });
    if (existingMembers !== memberIds.length) throw httpError('One or more team members do not exist', 404);
  }

  return Team.create({ name: name.trim(), mascot: mascot.trim(), members: memberIds });
}

export async function getLeaderboard() {
  const [teams, pointTotals] = await Promise.all([
    Team.find().select('_id name').lean(),
    Activity.aggregate<{ _id: mongoose.Types.ObjectId; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const totalsByTeam = new Map(pointTotals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));
  return teams
    .map((team) => ({
      teamName: team.name,
      totalPoints: totalsByTeam.get(team._id.toString()) ?? 0,
    }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function normalized(value: string) {
  return value.trim().toLowerCase();
}

function focusForActivity(type: string) {
  const focusByType: Record<string, string> = {
    bike: 'endurance',
    cycle: 'endurance',
    run: 'endurance',
    swim: 'endurance',
    walk: 'endurance',
    yoga: 'mobility',
  };
  return focusByType[normalized(type)] ?? normalized(type);
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).lean();
  if (!user) throw httpError('No user was found for that email address', 404);

  const [activities, workouts] = await Promise.all([
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(10).select('type').lean(),
    Workout.find().lean(),
  ]);
  const recentTypes = activities.map(({ type }) => type);
  const goal = normalized(user.fitnessGoal);

  return workouts
    .map((workout, index) => {
      const goalMatch = normalized(workout.focus) === goal;
      const matchingActivity = recentTypes.find((type) => focusForActivity(type) === normalized(workout.focus));
      const activityMatch = matchingActivity !== undefined;
      const reason = goalMatch && activityMatch
        ? `Matches your ${user.fitnessGoal} goal and recent ${matchingActivity} activity.`
        : goalMatch
          ? `Matches your ${user.fitnessGoal} fitness goal.`
          : activityMatch
            ? `Recommended based on your recent ${matchingActivity} activity.`
            : `A ${workout.focus} workout to support your ${user.fitnessGoal} goal.`;
      return {
        workout: { ...workout, reason },
        score: (goalMatch ? 2 : 0) + (activityMatch ? 1 : 0),
        index,
      };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ workout }) => workout);
}

export { User };

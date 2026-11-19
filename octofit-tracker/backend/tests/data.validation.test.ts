import { describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { seed } from '../src/scripts/seed.js';
import { Activity, Team, User, Workout } from '../src/models/index.js';

describe('OctoFit data validation', () => {
  it('rejects blank required text and out-of-range values', () => {
    const userError = new User({ name: ' ', email: ' ', fitnessGoal: ' ' }).validateSync();
    expect(userError?.errors.name).toBeDefined();
    expect(userError?.errors.email).toBeDefined();
    expect(userError?.errors.fitnessGoal).toBeDefined();

    const teamError = new Team({ name: ' ', mascot: ' ', members: [] }).validateSync();
    expect(teamError?.errors.name).toBeDefined();
    expect(teamError?.errors.mascot).toBeDefined();

    
    const activityError = new Activity({
      user: new mongoose.Types.ObjectId(),
      team: new mongoose.Types.ObjectId(),
      type: 'run',
      minutes: 0,
      points: -1,
      occurredAt: new Date(),
    }).validateSync();
    expect(activityError?.errors.minutes).toBeDefined();
    expect(activityError?.errors.points).toBeDefined();

    const workoutError = new Workout({
      title: 'Intervals',
      focus: 'endurance',
      minutes: 0,
      difficulty: 'moderate',
    }).validateSync();
    expect(workoutError?.errors.minutes).toBeDefined();
  });

  it('accepts complete valid activity and workout records', () => {
    const activity = new Activity({
      user: new mongoose.Types.ObjectId(),
      team: new mongoose.Types.ObjectId(),
      type: 'run',
      minutes: 30,
      points: 30,
      occurredAt: new Date(),
    });
    const workout = new Workout({
      title: 'Intervals',
      focus: 'endurance',
      minutes: 30,
      difficulty: 'moderate',
    });

    expect(activity.validateSync()).toBeUndefined();
    expect(workout.validateSync()).toBeUndefined();
  });

  it('seeds demo fixtures into an empty database', async () => {
    const mongo = await MongoMemoryServer.create();
    const previousUri = process.env.MONGODB_URI;
    process.env.MONGODB_URI = mongo.getUri();
    try {
      await seed();
      await mongoose.connect(mongo.getUri());

      const mona = await User.findOne({ email: 'mona@example.com' });
      const hubot = await User.findOne({ email: 'hubot@example.com' });
      const octocats = await Team.findOne({ name: 'Octocats' });
      const robocats = await Team.findOne({ name: 'Robocats' });
      expect(mona).toBeTruthy();
      expect(hubot).toBeTruthy();
      expect(octocats).toBeTruthy();
      expect(robocats).toBeTruthy();
      if (!mona || !hubot || !octocats || !robocats) throw new Error('Seed did not create all demo users and teams');

      expect(mona.team?.toString()).toBe(octocats._id.toString());
      expect(hubot.team?.toString()).toBe(robocats._id.toString());
      expect(await Activity.exists({ user: mona._id, team: octocats._id, type: 'run' })).toBeTruthy();
      expect(await Activity.exists({ user: hubot._id, team: robocats._id, type: 'cycle' })).toBeTruthy();
      expect(await Workout.exists({ title: 'Intervals', focus: 'endurance' })).toBeTruthy();
      expect(await Workout.exists({ title: 'Strength Circuit', focus: 'strength' })).toBeTruthy();
    } finally {
      if (previousUri === undefined) delete process.env.MONGODB_URI;
      else process.env.MONGODB_URI = previousUri;
      await mongoose.disconnect();
      await mongo.stop();
    }
  }, 60_000);
});

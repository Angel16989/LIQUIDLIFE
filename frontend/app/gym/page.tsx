import Link from "next/link";

type WorkoutExercise = {
  name: string;
  setsReps: string;
};

type WorkoutDay = {
  day: string;
  goal: string;
  exercises: WorkoutExercise[];
};

const workoutPlan: WorkoutDay[] = [
  {
    day: "Day 1 - Upper Body Strength",
    goal: "Build pressing and pulling strength with controlled compound work.",
    exercises: [
      { name: "Barbell Bench Press", setsReps: "4 x 6" },
      { name: "Bent-Over Row", setsReps: "4 x 8" },
      { name: "Overhead Press", setsReps: "3 x 8" },
      { name: "Lat Pulldown", setsReps: "3 x 10" },
      { name: "Dumbbell Lateral Raise", setsReps: "3 x 12" },
    ],
  },
  {
    day: "Day 2 - Lower Body Strength",
    goal: "Develop lower-body power and posterior chain stability.",
    exercises: [
      { name: "Back Squat", setsReps: "4 x 6" },
      { name: "Romanian Deadlift", setsReps: "4 x 8" },
      { name: "Walking Lunges", setsReps: "3 x 10 each leg" },
      { name: "Leg Press", setsReps: "3 x 12" },
      { name: "Standing Calf Raise", setsReps: "4 x 15" },
    ],
  },
  {
    day: "Day 3 - Push Hypertrophy",
    goal: "Increase volume for chest, shoulders, and triceps growth.",
    exercises: [
      { name: "Incline Dumbbell Press", setsReps: "4 x 10" },
      { name: "Seated Dumbbell Shoulder Press", setsReps: "3 x 10" },
      { name: "Cable Fly", setsReps: "3 x 12" },
      { name: "Triceps Rope Pushdown", setsReps: "3 x 12" },
      { name: "Push-Ups", setsReps: "2 x AMRAP" },
    ],
  },
  {
    day: "Day 4 - Pull + Conditioning",
    goal: "Improve back endurance and finish with cardiovascular conditioning.",
    exercises: [
      { name: "Deadlift", setsReps: "4 x 5" },
      { name: "Pull-Ups (Assisted if needed)", setsReps: "4 x 6-8" },
      { name: "Single-Arm Dumbbell Row", setsReps: "3 x 10 each arm" },
      { name: "Face Pull", setsReps: "3 x 15" },
      { name: "Bike or Rower Intervals", setsReps: "15-20 mins" },
    ],
  },
];

export default function GymPage() {
  return (
    <main className="ll-page px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 ll-panel p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] ll-muted">Gym</p>
            <h1 className="mt-2 text-3xl font-semibold">Workout Plan</h1>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-white/55 px-3 py-2 text-sm text-[#2b244d] transition hover:bg-white/85"
          >
            Back to Hub
          </Link>
        </header>

        {workoutPlan.map((dayPlan) => (
          <article key={dayPlan.day} className="ll-panel p-5">
            <h2 className="text-lg font-semibold ll-title">{dayPlan.day}</h2>
            <p className="mt-1 text-sm ll-muted">Goal: {dayPlan.goal}</p>

            <ul className="mt-4 divide-y divide-white/50 rounded-xl border border-white/50 bg-white/65">
              {dayPlan.exercises.map((exercise) => (
                <li key={exercise.name} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="font-medium ll-title">{exercise.name}</span>
                  <span className="rounded-md border border-white/55 bg-white/90 px-2 py-1 text-xs ll-muted">
                    {exercise.setsReps}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </main>
  );
}

import DashboardLayout from "@/components/DashboardLayout";

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
    <DashboardLayout title="Gym">
      <div className="space-y-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Motivation</p>
          <blockquote className="mt-3 text-xl font-medium leading-relaxed text-zinc-900 dark:text-zinc-100">
            &ldquo;Discipline is choosing between what you want now and what you want most.&rdquo;
          </blockquote>
        </section>

        <section className="space-y-4">
          {workoutPlan.map((dayPlan) => (
            <article
              key={dayPlan.day}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{dayPlan.day}</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Goal: {dayPlan.goal}</p>

              <ul className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-zinc-50 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/60">
                {dayPlan.exercises.map((exercise) => (
                  <li key={exercise.name} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="font-medium text-zinc-800 dark:text-zinc-100">{exercise.name}</span>
                    <span className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                      {exercise.setsReps}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </div>
    </DashboardLayout>
  );
}

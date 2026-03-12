"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getCurrentUsername } from "@/lib/auth";

type WorkoutExercise = {
  name: string;
  setsReps: string;
};

type WorkoutDay = {
  day: string;
  goal: string;
  exercises: WorkoutExercise[];
};

type WorkoutSet = {
  id: string;
  reps: string;
  weight: string;
  rest: string;
  note: string;
};

type CustomExercise = {
  id: string;
  name: string;
  target: string;
  sets: WorkoutSet[];
};

type CustomWorkoutDay = {
  id: string;
  title: string;
  label: string;
  goal: string;
  exercises: CustomExercise[];
};

type ExerciseDraft = {
  name: string;
  target: string;
};

type SetDraft = {
  reps: string;
  weight: string;
  rest: string;
  note: string;
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

const emptyExerciseDraft: ExerciseDraft = {
  name: "",
  target: "",
};

const emptySetDraft: SetDraft = {
  reps: "",
  weight: "",
  rest: "",
  note: "",
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function GymPage() {
  const { isChecking, isAuthenticated } = useRequireAuth();
  const [currentUsername] = useState(() => getCurrentUsername() ?? "member");
  const normalizedUsername = currentUsername.trim().toLowerCase();
  const isRasikPlan = normalizedUsername === "rasik";

  const [customWorkouts, setCustomWorkouts] = usePersistedState<CustomWorkoutDay[]>(
    `liquid-life-gym-workouts-${normalizedUsername || "member"}`,
    [],
  );
  const [workoutTitle, setWorkoutTitle] = useState("");
  const [workoutLabel, setWorkoutLabel] = useState("");
  const [workoutGoal, setWorkoutGoal] = useState("");
  const [exerciseDrafts, setExerciseDrafts] = useState<Record<string, ExerciseDraft>>({});
  const [setDrafts, setSetDrafts] = useState<Record<string, SetDraft>>({});

  function handleCreateWorkoutDay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextTitle = workoutTitle.trim();
    const nextLabel = workoutLabel.trim();
    const nextGoal = workoutGoal.trim();

    if (!nextTitle || !nextLabel || !nextGoal) {
      return;
    }

    setCustomWorkouts((current) => [
      {
        id: createId(),
        title: nextTitle,
        label: nextLabel,
        goal: nextGoal,
        exercises: [],
      },
      ...current,
    ]);
    setWorkoutTitle("");
    setWorkoutLabel("");
    setWorkoutGoal("");
  }

  function updateWorkoutDay(dayId: string, field: "title" | "label" | "goal", value: string) {
    setCustomWorkouts((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              [field]: value,
            }
          : day,
      ),
    );
  }

  function deleteWorkoutDay(dayId: string) {
    setCustomWorkouts((current) => current.filter((day) => day.id !== dayId));
    setExerciseDrafts((current) => {
      const next = { ...current };
      delete next[dayId];
      return next;
    });
  }

  function updateExerciseDraft(dayId: string, field: keyof ExerciseDraft, value: string) {
    setExerciseDrafts((current) => ({
      ...current,
      [dayId]: {
        ...(current[dayId] ?? emptyExerciseDraft),
        [field]: value,
      },
    }));
  }

  function addExercise(dayId: string) {
    const draft = exerciseDrafts[dayId] ?? emptyExerciseDraft;
    const nextName = draft.name.trim();
    const nextTarget = draft.target.trim();

    if (!nextName) {
      return;
    }

    const nextExerciseId = createId();
    setCustomWorkouts((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: [
                ...day.exercises,
                {
                  id: nextExerciseId,
                  name: nextName,
                  target: nextTarget,
                  sets: [],
                },
              ],
            }
          : day,
      ),
    );
    setExerciseDrafts((current) => ({
      ...current,
      [dayId]: emptyExerciseDraft,
    }));
  }

  function updateExercise(dayId: string, exerciseId: string, field: "name" | "target", value: string) {
    setCustomWorkouts((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.map((exercise) =>
                exercise.id === exerciseId
                  ? {
                      ...exercise,
                      [field]: value,
                    }
                  : exercise,
              ),
            }
          : day,
      ),
    );
  }

  function deleteExercise(dayId: string, exerciseId: string) {
    setCustomWorkouts((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.filter((exercise) => exercise.id !== exerciseId),
            }
          : day,
      ),
    );
    setSetDrafts((current) => {
      const next = { ...current };
      delete next[exerciseId];
      return next;
    });
  }

  function updateSetDraft(exerciseId: string, field: keyof SetDraft, value: string) {
    setSetDrafts((current) => ({
      ...current,
      [exerciseId]: {
        ...(current[exerciseId] ?? emptySetDraft),
        [field]: value,
      },
    }));
  }

  function addSet(dayId: string, exerciseId: string) {
    const draft = setDrafts[exerciseId] ?? emptySetDraft;
    if (!draft.reps.trim()) {
      return;
    }

    setCustomWorkouts((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.map((exercise) =>
                exercise.id === exerciseId
                  ? {
                      ...exercise,
                      sets: [
                        ...exercise.sets,
                        {
                          id: createId(),
                          reps: draft.reps.trim(),
                          weight: draft.weight.trim(),
                          rest: draft.rest.trim(),
                          note: draft.note.trim(),
                        },
                      ],
                    }
                  : exercise,
              ),
            }
          : day,
      ),
    );
    setSetDrafts((current) => ({
      ...current,
      [exerciseId]: emptySetDraft,
    }));
  }

  function updateSet(dayId: string, exerciseId: string, setId: string, field: keyof Omit<WorkoutSet, "id">, value: string) {
    setCustomWorkouts((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.map((exercise) =>
                exercise.id === exerciseId
                  ? {
                      ...exercise,
                      sets: exercise.sets.map((setItem) =>
                        setItem.id === setId
                          ? {
                              ...setItem,
                              [field]: value,
                            }
                          : setItem,
                      ),
                    }
                  : exercise,
              ),
            }
          : day,
      ),
    );
  }

  function deleteSet(dayId: string, exerciseId: string, setId: string) {
    setCustomWorkouts((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.map((exercise) =>
                exercise.id === exerciseId
                  ? {
                      ...exercise,
                      sets: exercise.sets.filter((setItem) => setItem.id !== setId),
                    }
                  : exercise,
              ),
            }
          : day,
      ),
    );
  }

  if (isChecking || !isAuthenticated) {
    return (
      <main className="ll-page flex items-center justify-center">
        <p className="ll-muted">Checking access...</p>
      </main>
    );
  }

  const totalExercises = customWorkouts.reduce((sum, day) => sum + day.exercises.length, 0);
  const totalSets = customWorkouts.reduce(
    (sum, day) => sum + day.exercises.reduce((exerciseSum, exercise) => exerciseSum + exercise.sets.length, 0),
    0,
  );

  return (
    <main className="ll-page px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="ll-panel flex flex-wrap items-center justify-between gap-3 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] ll-muted">Gym</p>
            <h1 className="mt-2 text-3xl font-semibold ll-title">
              {isRasikPlan ? "Workout Plan" : `${currentUsername}'s Training Builder`}
            </h1>
            <p className="mt-2 text-sm ll-muted">
              {isRasikPlan
                ? "Rasik stays on the locked coach-built split."
                : "Build custom workout days, add exercises, and track every set in one place."}
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-white/55 px-3 py-2 text-sm text-[#2b244d] transition hover:bg-white/85"
          >
            Back to Hub
          </Link>
        </header>

        {isRasikPlan ? (
          <section className="space-y-5">
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
          </section>
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <article className="ll-panel p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] ll-muted">Create Day</p>
                    <h2 className="mt-2 text-xl font-semibold ll-title">Add a new workout day</h2>
                  </div>
                  <span className="rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs font-semibold text-[#2b244d]">
                    Custom mode
                  </span>
                </div>

                <form onSubmit={handleCreateWorkoutDay} className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium ll-title">Workout Title</span>
                    <input
                      value={workoutTitle}
                      onChange={(event) => setWorkoutTitle(event.target.value)}
                      type="text"
                      placeholder="Push Day"
                      className="w-full rounded-xl border border-white/55 bg-white/90 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium ll-title">Day Label</span>
                    <input
                      value={workoutLabel}
                      onChange={(event) => setWorkoutLabel(event.target.value)}
                      type="text"
                      placeholder="Monday"
                      className="w-full rounded-xl border border-white/55 bg-white/90 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                    />
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium ll-title">Goal</span>
                    <textarea
                      value={workoutGoal}
                      onChange={(event) => setWorkoutGoal(event.target.value)}
                      rows={3}
                      placeholder="Chest, shoulders, and triceps with steady volume."
                      className="w-full rounded-xl border border-white/55 bg-white/90 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                    />
                  </label>

                  <button
                    type="submit"
                    className="rounded-xl bg-[#4f3f85] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 md:col-span-2"
                  >
                    Add Workout Day
                  </button>
                </form>
              </article>

              <section className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                <article className="ll-panel p-5">
                  <p className="text-xs uppercase tracking-[0.18em] ll-muted">Workout Days</p>
                  <p className="mt-2 text-3xl font-semibold ll-title">{customWorkouts.length}</p>
                </article>
                <article className="ll-panel p-5">
                  <p className="text-xs uppercase tracking-[0.18em] ll-muted">Exercises</p>
                  <p className="mt-2 text-3xl font-semibold ll-title">{totalExercises}</p>
                </article>
                <article className="ll-panel p-5">
                  <p className="text-xs uppercase tracking-[0.18em] ll-muted">Tracked Sets</p>
                  <p className="mt-2 text-3xl font-semibold ll-title">{totalSets}</p>
                </article>
              </section>
            </section>

            <section className="space-y-5">
              {customWorkouts.map((day) => {
                const dayExerciseCount = day.exercises.length;
                const daySetCount = day.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);

                return (
                  <article key={day.id} className="ll-panel p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="grid flex-1 gap-3 md:grid-cols-[1fr_180px]">
                        <input
                          value={day.title}
                          onChange={(event) => updateWorkoutDay(day.id, "title", event.target.value)}
                          className="rounded-xl border border-white/55 bg-white/90 px-3 py-2 text-lg font-semibold ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                        />
                        <input
                          value={day.label}
                          onChange={(event) => updateWorkoutDay(day.id, "label", event.target.value)}
                          className="rounded-xl border border-white/55 bg-white/90 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                        />
                        <textarea
                          value={day.goal}
                          onChange={(event) => updateWorkoutDay(day.id, "goal", event.target.value)}
                          rows={2}
                          className="rounded-xl border border-white/55 bg-white/90 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2 md:col-span-2"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex gap-2 text-xs font-semibold">
                          <span className="rounded-full border border-white/60 bg-white/80 px-3 py-1 text-[#2b244d]">
                            {dayExerciseCount} exercises
                          </span>
                          <span className="rounded-full border border-white/60 bg-white/80 px-3 py-1 text-[#2b244d]">
                            {daySetCount} sets
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteWorkoutDay(day.id)}
                          className="w-full rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          Delete Workout Day
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-white/50 bg-white/70 p-4">
                      <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_auto]">
                        <input
                          value={exerciseDrafts[day.id]?.name ?? ""}
                          onChange={(event) => updateExerciseDraft(day.id, "name", event.target.value)}
                          type="text"
                          placeholder="Exercise name"
                          className="rounded-xl border border-white/55 bg-white/95 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                        />
                        <input
                          value={exerciseDrafts[day.id]?.target ?? ""}
                          onChange={(event) => updateExerciseDraft(day.id, "target", event.target.value)}
                          type="text"
                          placeholder="Target area"
                          className="rounded-xl border border-white/55 bg-white/95 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                        />
                        <button
                          type="button"
                          onClick={() => addExercise(day.id)}
                          className="rounded-xl bg-[#4f3f85] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                        >
                          Add Exercise
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      {day.exercises.map((exercise) => (
                        <section key={exercise.id} className="rounded-2xl border border-white/50 bg-white/65 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="grid flex-1 gap-3 md:grid-cols-[1.1fr_0.9fr]">
                              <input
                                value={exercise.name}
                                onChange={(event) => updateExercise(day.id, exercise.id, "name", event.target.value)}
                                className="rounded-xl border border-white/55 bg-white/95 px-3 py-2 text-sm font-semibold ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                              />
                              <input
                                value={exercise.target}
                                onChange={(event) => updateExercise(day.id, exercise.id, "target", event.target.value)}
                                placeholder="Target area"
                                className="rounded-xl border border-white/55 bg-white/95 px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteExercise(day.id, exercise.id)}
                              className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                            >
                              Remove Exercise
                            </button>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-4">
                            {(exercise.sets.length > 0 ? exercise.sets : []).map((setItem, index) => (
                              <article key={setItem.id} className="rounded-xl border border-white/60 bg-white/90 p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs font-semibold uppercase tracking-[0.15em] ll-muted">Set {index + 1}</p>
                                  <button
                                    type="button"
                                    onClick={() => deleteSet(day.id, exercise.id, setItem.id)}
                                    className="text-xs font-semibold text-rose-600 hover:underline"
                                  >
                                    Delete
                                  </button>
                                </div>

                                <div className="mt-3 grid gap-2">
                                  <input
                                    value={setItem.reps}
                                    onChange={(event) => updateSet(day.id, exercise.id, setItem.id, "reps", event.target.value)}
                                    placeholder="Reps"
                                    className="rounded-lg border border-white/60 bg-white px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                                  />
                                  <input
                                    value={setItem.weight}
                                    onChange={(event) => updateSet(day.id, exercise.id, setItem.id, "weight", event.target.value)}
                                    placeholder="Weight"
                                    className="rounded-lg border border-white/60 bg-white px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                                  />
                                  <input
                                    value={setItem.rest}
                                    onChange={(event) => updateSet(day.id, exercise.id, setItem.id, "rest", event.target.value)}
                                    placeholder="Rest"
                                    className="rounded-lg border border-white/60 bg-white px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                                  />
                                  <input
                                    value={setItem.note}
                                    onChange={(event) => updateSet(day.id, exercise.id, setItem.id, "note", event.target.value)}
                                    placeholder="Notes"
                                    className="rounded-lg border border-white/60 bg-white px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                                  />
                                </div>
                              </article>
                            ))}
                          </div>

                          <div className="mt-4 rounded-xl border border-dashed border-white/70 bg-white/70 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.15em] ll-muted">Add Set</p>
                            <div className="mt-3 grid gap-3 md:grid-cols-[0.8fr_0.8fr_0.8fr_1.4fr_auto]">
                              <input
                                value={setDrafts[exercise.id]?.reps ?? ""}
                                onChange={(event) => updateSetDraft(exercise.id, "reps", event.target.value)}
                                placeholder="Reps"
                                className="rounded-lg border border-white/60 bg-white px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                              />
                              <input
                                value={setDrafts[exercise.id]?.weight ?? ""}
                                onChange={(event) => updateSetDraft(exercise.id, "weight", event.target.value)}
                                placeholder="Weight"
                                className="rounded-lg border border-white/60 bg-white px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                              />
                              <input
                                value={setDrafts[exercise.id]?.rest ?? ""}
                                onChange={(event) => updateSetDraft(exercise.id, "rest", event.target.value)}
                                placeholder="Rest"
                                className="rounded-lg border border-white/60 bg-white px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                              />
                              <input
                                value={setDrafts[exercise.id]?.note ?? ""}
                                onChange={(event) => updateSetDraft(exercise.id, "note", event.target.value)}
                                placeholder="Notes"
                                className="rounded-lg border border-white/60 bg-white px-3 py-2 text-sm ll-title outline-none ring-[#5f4d93] transition focus:ring-2"
                              />
                              <button
                                type="button"
                                onClick={() => addSet(day.id, exercise.id)}
                                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-85"
                              >
                                Add Set
                              </button>
                            </div>
                          </div>
                        </section>
                      ))}

                      {day.exercises.length === 0 && (
                        <p className="rounded-xl border border-dashed border-white/60 bg-white/55 px-4 py-5 text-sm ll-muted">
                          No exercises yet. Add the first one above, then start logging individual sets.
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}

              {customWorkouts.length === 0 && (
                <article className="ll-panel p-6 text-center">
                  <p className="text-sm ll-muted">
                    No custom workout days yet. Start with your split, then build each exercise set by set.
                  </p>
                </article>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

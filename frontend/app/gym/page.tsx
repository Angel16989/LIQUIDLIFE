import DashboardCards, { type DashboardCard } from "@/components/DashboardCards";
import DashboardLayout from "@/components/DashboardLayout";

const gymCards: DashboardCard[] = [
  { label: "Workouts This Week", value: "4", delta: "1 remaining" },
  { label: "Active Streak", value: "9 days", delta: "Personal best" },
  { label: "Calories Burned", value: "2,450", delta: "+180 today" },
  { label: "Recovery Score", value: "82%", delta: "Good to train" },
];

export default function GymPage() {
  return (
    <DashboardLayout title="Gym">
      <div className="space-y-6">
        <DashboardCards cards={gymCards} />

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Today&apos;s Training</h3>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
            Lower body strength + 20 minutes cardio. Keep rest periods tight and log your working sets.
          </p>
        </section>
      </div>
    </DashboardLayout>
  );
}

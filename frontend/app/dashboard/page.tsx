import DashboardCards, { type DashboardCard } from "@/components/DashboardCards";
import DashboardLayout from "@/components/DashboardLayout";

const dashboardCards: DashboardCard[] = [
  { label: "Tasks Completed", value: "18", delta: "+12% this week" },
  { label: "Job Applications", value: "6", delta: "+2 today" },
  { label: "Workout Sessions", value: "4", delta: "On track" },
  { label: "Learning Hours", value: "11h", delta: "+3h from last week" },
];

export default function DashboardPage() {
  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        <DashboardCards cards={dashboardCards} />

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Today&apos;s Priorities</h3>
            <ul className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
              <li>Finalize backend task board architecture</li>
              <li>Apply to 2 product engineer roles</li>
              <li>Complete full-body strength workout</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Weekly Focus</h3>
            <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Build momentum through consistency. Keep your systems simple and track your
              progress daily across work, fitness, and learning.
            </p>
          </article>
        </section>
      </div>
    </DashboardLayout>
  );
}

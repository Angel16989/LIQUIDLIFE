import DashboardCards, { type DashboardCard } from "@/components/DashboardCards";
import DashboardLayout from "@/components/DashboardLayout";

const jobsCards: DashboardCard[] = [
  { label: "Open Roles", value: "27", delta: "Filtered this week" },
  { label: "Applications", value: "14", delta: "+3 pending" },
  { label: "Interviews", value: "2", delta: "Next on Tuesday" },
  { label: "Follow Ups", value: "5", delta: "Due today" },
];

export default function JobsPage() {
  return (
    <DashboardLayout title="Jobs">
      <div className="space-y-6">
        <DashboardCards cards={jobsCards} />

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Pipeline Snapshot</h3>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
            Track each role from shortlist to offer. Prioritize follow-ups and keep your weekly application goal visible.
          </p>
        </section>
      </div>
    </DashboardLayout>
  );
}

import DashboardCards, { type DashboardCard } from "@/components/DashboardCards";
import DashboardLayout from "@/components/DashboardLayout";

const learningCards: DashboardCard[] = [
  { label: "Study Hours", value: "11h", delta: "+3h this week" },
  { label: "Courses Active", value: "3", delta: "1 near completion" },
  { label: "Projects Built", value: "2", delta: "Shipped this month" },
  { label: "Reading Queue", value: "7", delta: "2 added" },
];

export default function LearningPage() {
  return (
    <DashboardLayout title="Learning">
      <div className="space-y-6">
        <DashboardCards cards={learningCards} />

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Current Sprint</h3>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
            Focus on system design, advanced TypeScript patterns, and one practical project milestone every week.
          </p>
        </section>
      </div>
    </DashboardLayout>
  );
}

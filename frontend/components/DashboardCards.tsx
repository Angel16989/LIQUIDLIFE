export type DashboardCard = {
  label: string;
  value: string;
  delta: string;
};

type DashboardCardsProps = {
  cards: DashboardCard[];
};

export default function DashboardCards({ cards }: DashboardCardsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        >
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{card.value}</p>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{card.delta}</p>
        </article>
      ))}
    </section>
  );
}

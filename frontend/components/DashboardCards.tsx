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
        <article key={card.label} className="ll-panel-soft p-5">
          <p className="text-sm ll-muted">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold ll-title">{card.value}</p>
          <p className="mt-1 text-xs text-[#3b7d55]">{card.delta}</p>
        </article>
      ))}
    </section>
  );
}

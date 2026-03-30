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
        <article key={card.label} className="ll-stat-card">
          <p className="ll-stat-label">{card.label}</p>
          <p className="ll-stat-value">{card.value}</p>
          <p className="ll-stat-delta">{card.delta}</p>
        </article>
      ))}
    </section>
  );
}

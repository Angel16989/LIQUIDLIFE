import Link from "next/link";

type ModuleCard = {
  title: "Career" | "Fitness" | "Learning";
  href: "/jobs" | "/gym" | "/learning";
  icon: React.ReactNode;
  delayMs: number;
};

const cards: ModuleCard[] = [
  {
    title: "Career",
    href: "/jobs",
    delayMs: 0,
    icon: (
      <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M3 8h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 12h18" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Fitness",
    href: "/gym",
    delayMs: 220,
    icon: (
      <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 10v4M7 8v8M17 8v8M20 10v4" strokeLinecap="round" />
        <path d="M7 12h10" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Learning",
    href: "/learning",
    delayMs: 420,
    icon: (
      <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M3 6.5 12 3l9 3.5-9 3.5-9-3.5Z" strokeLinejoin="round" />
        <path d="M5 9.5V16l7 3 7-3V9.5" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <main className="ll-page flex items-center justify-center">
      <section className="ll-container text-center">
        <div className="ll-panel px-6 py-10 sm:px-10">
          <p className="text-xs uppercase tracking-[0.32em] ll-muted">Liquid Life</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight ll-title sm:text-5xl">Choose Your Focus</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm ll-muted sm:text-base">
            Jump into one module and keep your momentum moving.
          </p>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group ll-card-float flex aspect-square w-full items-center justify-center rounded-full border border-white/60 bg-white/72 p-6 text-[#2b244d] shadow-2xl backdrop-blur transition-transform duration-300 hover:scale-[1.06] hover:bg-white hover:shadow-[0_0_45px_rgba(95,77,147,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5f4d93]"
                style={{ animationDelay: `${card.delayMs}ms` }}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="rounded-full border border-white/70 bg-white/80 p-4 text-[#3d316b] transition group-hover:bg-white">
                    {card.icon}
                  </div>
                  <span className="text-2xl font-semibold tracking-wide">{card.title}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

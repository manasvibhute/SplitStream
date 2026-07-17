import { Plus } from "lucide-react";

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-normal text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink/55">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }) {
  return <section className={`rounded-lg border border-ink/10 bg-white p-5 shadow-panel ${className}`}>{children}</section>;
}

export function StatCard({ label, value, tone = "neutral", icon: Icon }) {
  const tones = {
    positive: "bg-mint/10 text-mint",
    negative: "bg-coral/10 text-coral",
    neutral: "bg-ink/5 text-ink",
  };
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-ink/55">{label}</div>
          <div className="mt-2 text-2xl font-black">{value}</div>
        </div>
        {Icon && (
          <div className={`rounded-md p-2 ${tones[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}

export function EmptyState({ icon: Icon = Plus, title, message, action }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-ink/15 bg-ink/[0.03] p-8 text-center">
      <div>
        <Icon className="mx-auto h-9 w-9 text-ink/35" />
        <h3 className="mt-3 font-black">{title}</h3>
        {message && <p className="mt-1 text-sm text-ink/55">{message}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}

export function SkeletonGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="h-28 animate-pulse rounded-lg bg-ink/5" />
      ))}
    </div>
  );
}

export function formatMoney(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

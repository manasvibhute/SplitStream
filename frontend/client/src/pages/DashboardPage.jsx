import { BarChart3, HandCoins, Plus, ReceiptText, Users, WalletCards } from "lucide-react";
import ActivityFeed from "../components/ActivityFeed";
import { Card, EmptyState, formatMoney, PageHeader, SkeletonGrid, StatCard } from "../components/ui";

export default function DashboardPage({ analytics, status, onCreateGroup, onOpenGroup }) {
  if (!analytics && status === "loading") return <SkeletonGrid />;
  const data = analytics || {};
  const dashboard = data.dashboard || {};
  const groups = data.groups || [];
  const activity = data.activity || [];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Dashboard"
        subtitle="A consolidated view of groups, balances, and recent expense movement."
        action={
          <button className="focus-ring rounded-md bg-mint px-4 py-3 text-sm font-black text-white" onClick={onCreateGroup}>
            <Plus className="inline h-4 w-4" /> New group
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total you owe" value={formatMoney(dashboard.totalOwe)} tone="negative" icon={HandCoins} />
        <StatCard label="Total owed to you" value={formatMoney(dashboard.totalOwed)} tone="positive" icon={WalletCards} />
        <StatCard label="Net balance" value={formatMoney(dashboard.netBalance)} tone={dashboard.netBalance >= 0 ? "positive" : "negative"} icon={BarChart3} />
        <StatCard label="Active groups" value={dashboard.activeGroups || 0} icon={Users} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black">Your groups</h2>
            <span className="text-sm font-bold text-ink/45">{groups.length} active</span>
          </div>
          {groups.length === 0 ? (
            <EmptyState icon={Users} title="No groups yet" message="Create a group and start splitting shared expenses." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {groups.map((group) => (
                <button
                  key={group.id}
                  className="focus-ring rounded-lg border border-ink/10 p-4 text-left hover:border-mint hover:bg-[#f2f7f1]"
                  onClick={() => onOpenGroup(group.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black">{group.name}</h3>
                      <p className="mt-1 text-sm text-ink/50">{group.memberCount} members</p>
                    </div>
                    <span className={`font-black ${group.netBalance >= 0 ? "text-mint" : "text-coral"}`}>
                      {formatMoney(group.netBalance)}
                    </span>
                  </div>
                  <div className="mt-4 flex -space-x-2">
                    {Array.from({ length: Math.min(group.memberCount, 4) }).map((_, index) => (
                      <div key={index} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-ink text-xs font-black text-white">
                        {index + 1}
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-mint" />
            <h2 className="text-lg font-black">Recent activity</h2>
          </div>
          {activity.length === 0 ? (
            <EmptyState icon={ReceiptText} title="No activity yet" message="New expenses and settlements will appear here." />
          ) : (
            <ActivityFeed items={activity} limit={6} />
          )}
        </Card>
      </div>
    </div>
  );
}

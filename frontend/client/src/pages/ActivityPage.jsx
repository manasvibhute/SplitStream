import { ReceiptText } from "lucide-react";
import ActivityFeed from "../components/ActivityFeed";
import { Card, EmptyState, PageHeader } from "../components/ui";

export default function ActivityPage({ analytics }) {
  const activity = analytics?.activity || [];
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Activity" subtitle="Chronological timeline of group events." />
      <Card>
        {activity.length === 0 ? (
          <EmptyState icon={ReceiptText} title="No activity yet" message="Expenses, member joins, and settlements will appear here." />
        ) : (
          <ActivityFeed items={activity} />
        )}
      </Card>
    </div>
  );
}

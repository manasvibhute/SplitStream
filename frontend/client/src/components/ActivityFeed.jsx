import { formatDistanceToNow } from "date-fns";
import { HandCoins, ReceiptText, UserPlus } from "lucide-react";
import { formatMoney } from "./ui";

const icons = {
  expense_added: ReceiptText,
  settlement_made: HandCoins,
  member_joined: UserPlus,
};

export default function ActivityFeed({ items = [], limit }) {
  const visible = limit ? items.slice(0, limit) : items;
  return (
    <div className="space-y-3">
      {visible.map((event) => {
        const Icon = icons[event.type] || ReceiptText;
        return (
          <div key={event.id} className="flex gap-3 rounded-lg border border-ink/10 bg-white p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#f2f7f1] text-mint">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{event.label}</p>
                {event.amount ? <span className="text-sm font-black">{formatMoney(event.amount)}</span> : null}
              </div>
              <p className="text-sm text-ink/50">
                {event.groupName} · {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

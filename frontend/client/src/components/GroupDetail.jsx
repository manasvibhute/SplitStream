import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ArrowRight, HandCoins, Hotel, Plane, Plus, ReceiptText, ShoppingBag, Trash2, Utensils, UserPlus, Users } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";
import { addMember, deleteExpense, settleUp } from "../features/groupsSlice";
import AddExpenseModal from "./AddExpenseModal";
import SettleModal from "./SettleModal";
import { Card, EmptyState, formatMoney } from "./ui";

const tabs = ["expenses", "balances", "members"];
const categoryIcons = {
  Food: Utensils,
  Travel: Plane,
  Stay: Hotel,
  Shopping: ShoppingBag,
  Other: ReceiptText,
};

export default function GroupDetail({ groupId }) {
  const dispatch = useDispatch();
  const { current, status, error } = useSelector((state) => state.groups);
  const [tab, setTab] = useState("expenses");
  const [showExpense, setShowExpense] = useState(false);
  const [showSettle, setShowSettle] = useState(false);
  const [email, setEmail] = useState("");

  const selectedDebt = useMemo(() => current?.balances?.simplified?.[0] || null, [current]);
  const trend = useMemo(() => buildTrend(current?.expenses || []), [current]);
  const totalSpend = useMemo(() => (current?.expenses || []).reduce((sum, expense) => sum + expense.amount, 0), [current]);

  if (!groupId) {
    return (
      <Card className="min-h-[520px]">
        <EmptyState icon={Users} title="No group selected" message="Create or select a group to manage expenses." />
      </Card>
    );
  }

  if (!current || current.id !== groupId) {
    return <Card className="min-h-[520px]">{status === "loading" ? "Loading group..." : "Select a group."}</Card>;
  }

  async function submitMember(event) {
    event.preventDefault();
    if (!email.trim()) return;
    await dispatch(addMember({ groupId: current.id, email: email.trim() }));
    setEmail("");
  }

  return (
    <section className="min-w-0 space-y-5">
      <Card>
        <div className="flex flex-col gap-4 border-b border-ink/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-3xl font-black">{current.name}</h2>
            <p className="mt-1 text-sm text-ink/55">Live expenses, balances, members, and settlement suggestions.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="focus-ring rounded-md bg-mint px-4 py-3 text-sm font-black text-white" onClick={() => setShowExpense(true)}>
              <Plus className="inline h-4 w-4" /> Add expense
            </button>
            <button className="focus-ring rounded-md bg-ink px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setShowSettle(true)} disabled={!selectedDebt}>
              <HandCoins className="inline h-4 w-4" /> Settle
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Metric label="Group spend" value={formatMoney(totalSpend)} icon={ReceiptText} />
          <Metric label="Members" value={current.members.length} icon={Users} />
          <Metric label="Open settlements" value={current.balances.simplified.length} icon={HandCoins} />
        </div>

        <div className="mt-5 rounded-lg bg-[#f2f7f1] p-4">
          <div className="mb-2 text-sm font-black text-ink/60">Group spending trend</div>
          <div className="h-20">
            {trend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <Tooltip formatter={(value) => formatMoney(value)} />
                  <Line type="monotone" dataKey="amount" stroke="#2fbf71" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center text-sm font-semibold text-ink/45">Add expenses to see trend data.</div>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-0">
        {error && <p className="mx-5 mt-5 rounded-md bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">{error}</p>}
        <div className="flex gap-1 border-b border-ink/10 px-5 pt-4">
          {tabs.map((item) => (
            <button
              key={item}
              className={`focus-ring rounded-t-md px-4 py-3 text-sm font-black capitalize ${
                tab === item ? "bg-[#f2f7f1] text-ink" : "text-ink/55 hover:text-ink"
              }`}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "expenses" && <Expenses group={current} onDelete={(id) => dispatch(deleteExpense(id))} onAdd={() => setShowExpense(true)} />}
          {tab === "balances" && <Balances group={current} />}
          {tab === "members" && <Members group={current} email={email} setEmail={setEmail} submitMember={submitMember} />}
        </div>
      </Card>

      {showExpense && <AddExpenseModal group={current} onClose={() => setShowExpense(false)} />}
      {showSettle && (
        <SettleModal
          group={current}
          defaultDebt={selectedDebt}
          onClose={() => setShowSettle(false)}
          onSubmit={(settlement) => dispatch(settleUp({ groupId: current.id, settlement }))}
        />
      )}
    </section>
  );
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-ink/55">{label}</div>
          <div className="mt-1 text-xl font-black">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-mint" />
      </div>
    </div>
  );
}

function Expenses({ group, onDelete, onAdd }) {
  if (group.expenses.length === 0) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="No expenses yet"
        message="Add the first shared expense for this group."
        action={
          <button className="focus-ring rounded-md bg-mint px-4 py-2 text-sm font-black text-white" onClick={onAdd}>
            <Plus className="inline h-4 w-4" /> Add expense
          </button>
        }
      />
    );
  }

  return (
    <div className="grid gap-3">
      {group.expenses.map((expense) => {
        const Icon = categoryIcons[expense.category] || ReceiptText;
        return (
          <article key={expense.id} className="rounded-lg border border-ink/10 p-4 transition hover:border-mint hover:shadow-panel">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#f2f7f1] text-mint">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black">{expense.description}</h3>
                    <span className="rounded-full bg-ink/5 px-2 py-1 text-xs font-bold text-ink/55">{expense.category || "Other"}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink/55">
                    Paid by {expense.paidBy.name} · {new Date(expense.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black">{formatMoney(expense.amount)}</span>
                <button className="focus-ring rounded-md p-2 text-coral hover:bg-coral/10" onClick={() => onDelete(expense.id)} title="Delete expense">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {expense.splits.map((split) => (
                <span key={`${expense.id}-${split.userId}`} className="rounded-full bg-ink/5 px-3 py-1 text-xs font-bold text-ink/65">
                  {split.name}: {formatMoney(split.amountOwed)}
                </span>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function Balances({ group }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <div>
        <h3 className="mb-3 text-lg font-black">Net balances</h3>
        <div className="space-y-2">
          {group.balances.raw.map((balance) => (
            <div key={balance.userId} className="flex items-center justify-between rounded-lg border border-ink/10 px-4 py-3">
              <div>
                <div className="font-black">{balance.name}</div>
                <div className="text-sm text-ink/50">{balance.balance >= 0 ? "Is owed" : "Owes"}</div>
              </div>
              <span className={balance.balance >= 0 ? "font-black text-mint" : "font-black text-coral"}>
                {balance.balance >= 0 ? "+" : "-"}{formatMoney(Math.abs(balance.balance))}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-lg font-black">Simplified debts</h3>
        <div className="space-y-2">
          {group.balances.simplified.length === 0 && <EmptyState icon={HandCoins} title="Everyone is settled" message="No settlement transactions are needed." />}
          {group.balances.simplified.map((debt, index) => (
            <div key={index} className="flex items-center justify-between gap-3 rounded-lg border border-ink/10 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <b className="truncate">{debt.fromName}</b>
                <ArrowRight className="h-4 w-4 shrink-0 text-coral" />
                <b className="truncate">{debt.toName}</b>
              </div>
              <span className="font-black text-coral">{formatMoney(debt.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Members({ group, email, setEmail, submitMember }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className="grid gap-3 md:grid-cols-2">
        {group.members.map((member) => (
          <div key={member.id} className="flex items-center justify-between rounded-lg border border-ink/10 px-4 py-3">
            <div className="min-w-0">
              <div className="truncate font-black">{member.name}</div>
              <div className="truncate text-sm text-ink/55">{member.email}</div>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint text-sm font-black text-white">
              {member.name.slice(0, 1).toUpperCase()}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={submitMember} className="rounded-lg bg-[#f2f7f1] p-4">
        <label className="text-sm font-black">Add member by email</label>
        <input className="focus-ring mt-2 w-full rounded-md border border-ink/15 px-3 py-2" value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
        <button className="focus-ring mt-3 w-full rounded-md bg-ink px-3 py-2 text-sm font-bold text-white">
          <UserPlus className="inline h-4 w-4" /> Add member
        </button>
      </form>
    </div>
  );
}

function buildTrend(expenses) {
  const byDay = new Map();
  expenses.forEach((expense) => {
    const day = new Date(expense.createdAt).toISOString().slice(5, 10);
    byDay.set(day, (byDay.get(day) || 0) + expense.amount);
  });
  return Array.from(byDay.entries())
    .map(([day, amount]) => ({ day, amount: Number(amount.toFixed(2)) }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

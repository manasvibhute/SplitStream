import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HandCoins, Plus, ReceiptText, Trash2, UserPlus, Users } from "lucide-react";
import { addMember, deleteExpense, settleUp } from "../features/groupsSlice";
import AddExpenseModal from "./AddExpenseModal";
import SettleModal from "./SettleModal";

const tabs = ["expenses", "balances", "members"];

export default function GroupDetail({ groupId }) {
  const dispatch = useDispatch();
  const { current, status, error } = useSelector((state) => state.groups);
  const [tab, setTab] = useState("expenses");
  const [showExpense, setShowExpense] = useState(false);
  const [showSettle, setShowSettle] = useState(false);
  const [email, setEmail] = useState("");

  const selectedDebt = useMemo(() => current?.balances?.simplified?.[0] || null, [current]);

  if (!groupId) {
    return (
      <section className="flex min-h-[460px] items-center justify-center rounded-lg bg-white p-8 text-center shadow-panel">
        <div>
          <Users className="mx-auto h-10 w-10 text-mint" />
          <h2 className="mt-3 text-xl font-black">No group selected</h2>
          <p className="mt-1 text-sm text-ink/60">Create or select a group to see live expenses.</p>
        </div>
      </section>
    );
  }

  if (!current || current.id !== groupId) {
    return <section className="rounded-lg bg-white p-8 shadow-panel">{status === "loading" ? "Loading group..." : "Select a group."}</section>;
  }

  async function submitMember(event) {
    event.preventDefault();
    if (!email.trim()) return;
    await dispatch(addMember({ groupId: current.id, email: email.trim() }));
    setEmail("");
  }

  return (
    <section className="min-w-0 rounded-lg bg-white shadow-panel">
      <div className="flex flex-col gap-4 border-b border-ink/10 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black">{current.name}</h2>
          <p className="text-sm text-ink/55">Balances update live for everyone in this group.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="focus-ring rounded-md bg-mint px-3 py-2 text-sm font-bold text-white" onClick={() => setShowExpense(true)}>
            <Plus className="inline h-4 w-4" /> Add expense
          </button>
          <button className="focus-ring rounded-md bg-ink px-3 py-2 text-sm font-bold text-white" onClick={() => setShowSettle(true)} disabled={!selectedDebt}>
            <HandCoins className="inline h-4 w-4" /> Settle
          </button>
        </div>
      </div>

      {error && <p className="mx-4 mt-4 rounded-md bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">{error}</p>}

      <div className="flex gap-1 border-b border-ink/10 px-4 pt-3">
        {tabs.map((item) => (
          <button
            key={item}
            className={`focus-ring rounded-t-md px-4 py-2 text-sm font-bold capitalize ${
              tab === item ? "bg-[#f2f7f1] text-ink" : "text-ink/55 hover:text-ink"
            }`}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === "expenses" && <Expenses group={current} onDelete={(id) => dispatch(deleteExpense(id))} />}
        {tab === "balances" && <Balances group={current} />}
        {tab === "members" && <Members group={current} email={email} setEmail={setEmail} submitMember={submitMember} />}
      </div>

      {showExpense && <AddExpenseModal group={current} onClose={() => setShowExpense(false)} />}
      {showSettle && <SettleModal group={current} defaultDebt={selectedDebt} onClose={() => setShowSettle(false)} onSubmit={(settlement) => dispatch(settleUp({ groupId: current.id, settlement }))} />}
    </section>
  );
}

function Expenses({ group, onDelete }) {
  if (group.expenses.length === 0) return <Empty icon={ReceiptText} text="No expenses yet." />;
  return (
    <div className="space-y-3">
      {group.expenses.map((expense) => (
        <article key={expense.id} className="rounded-lg border border-ink/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-black">{expense.description}</h3>
              <p className="text-sm text-ink/55">
                Paid by {expense.paidBy.name} · {new Date(expense.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black">₹{expense.amount.toFixed(2)}</span>
              <button className="focus-ring rounded-md p-2 text-coral hover:bg-coral/10" onClick={() => onDelete(expense.id)} title="Delete expense">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {expense.splits.map((split) => (
              <span key={`${expense.id}-${split.userId}`} className="rounded-full bg-ink/5 px-3 py-1 text-xs font-bold text-ink/65">
                {split.name}: ₹{split.amountOwed.toFixed(2)}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function Balances({ group }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div>
        <h3 className="mb-2 font-black">Net balances</h3>
        <div className="space-y-2">
          {group.balances.raw.map((balance) => (
            <div key={balance.userId} className="flex justify-between rounded-md bg-[#f2f7f1] px-3 py-2">
              <span className="font-bold">{balance.name}</span>
              <span className={balance.balance >= 0 ? "font-black text-mint" : "font-black text-coral"}>
                {balance.balance >= 0 ? "+" : "-"}₹{Math.abs(balance.balance).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-2 font-black">Simplified settlements</h3>
        <div className="space-y-2">
          {group.balances.simplified.length === 0 && <p className="rounded-md bg-ink/5 px-3 py-8 text-center text-sm text-ink/55">Everyone is settled.</p>}
          {group.balances.simplified.map((debt, index) => (
            <div key={index} className="rounded-md border border-ink/10 px-3 py-2 text-sm">
              <b>{debt.fromName}</b> pays <b>{debt.toName}</b> ₹{debt.amount.toFixed(2)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Members({ group, email, setEmail, submitMember }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <div className="space-y-2">
        {group.members.map((member) => (
          <div key={member.id} className="flex items-center justify-between rounded-md border border-ink/10 px-3 py-3">
            <div>
              <div className="font-black">{member.name}</div>
              <div className="text-sm text-ink/55">{member.email}</div>
            </div>
            <Users className="h-5 w-5 text-mint" />
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

function Empty({ icon: Icon, text }) {
  return (
    <div className="rounded-lg bg-ink/5 px-4 py-12 text-center text-ink/55">
      <Icon className="mx-auto h-8 w-8" />
      <p className="mt-2 text-sm font-semibold">{text}</p>
    </div>
  );
}

import { useState } from "react";
import { X } from "lucide-react";

export default function SettleModal({ group, defaultDebt, onClose, onSubmit }) {
  const [fromUserId, setFromUserId] = useState(defaultDebt?.fromUserId || group.members[0]?.id || "");
  const [toUserId, setToUserId] = useState(defaultDebt?.toUserId || group.members[1]?.id || "");
  const [amount, setAmount] = useState(defaultDebt?.amount || "");

  async function submit(event) {
    event.preventDefault();
    await onSubmit({ fromUserId, toUserId, amount: Number(amount) });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink/40 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg bg-white p-5 shadow-panel">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">Settle up</h2>
          <button type="button" className="focus-ring rounded-md p-2 hover:bg-ink/5" onClick={onClose} title="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <Select label="From" value={fromUserId} onChange={setFromUserId} members={group.members} />
        <Select label="To" value={toUserId} onChange={setToUserId} members={group.members} />
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-bold text-ink/70">Amount</span>
          <input className="focus-ring w-full rounded-md border border-ink/15 px-3 py-3" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
        </label>
        <button className="focus-ring w-full rounded-md bg-ink px-4 py-3 font-black text-white">Confirm settlement</button>
      </form>
    </div>
  );
}

function Select({ label, value, onChange, members }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block text-sm font-bold text-ink/70">{label}</span>
      <select className="focus-ring w-full rounded-md border border-ink/15 px-3 py-3" value={value} onChange={(event) => onChange(event.target.value)}>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>
    </label>
  );
}

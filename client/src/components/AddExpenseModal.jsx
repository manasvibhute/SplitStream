import { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { X } from "lucide-react";
import { addExpense } from "../features/groupsSlice";

export default function AddExpenseModal({ group, onClose }) {
  const dispatch = useDispatch();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [splitType, setSplitType] = useState("equal");
  const [selected, setSelected] = useState(() => new Set(group.members.map((member) => member.id)));
  const [values, setValues] = useState({});

  const participants = useMemo(
    () =>
      group.members
        .filter((member) => selected.has(member.id))
        .map((member) => ({
          userId: member.id,
          percentage: Number(values[member.id] || 0),
          amountOwed: Number(values[member.id] || 0),
        })),
    [group.members, selected, values]
  );

  async function submit(event) {
    event.preventDefault();
    await dispatch(addExpense({ groupId: group.id, expense: { description, amount: Number(amount), splitType, splits: participants } }));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink/40 p-4">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-5 shadow-panel">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">Add expense</h2>
          <button type="button" className="focus-ring rounded-md p-2 hover:bg-ink/5" onClick={onClose} title="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Description" value={description} onChange={setDescription} />
          <Field label="Amount" type="number" value={amount} onChange={setAmount} />
          <label>
            <span className="mb-1 block text-sm font-bold text-ink/70">Split type</span>
            <select className="focus-ring w-full rounded-md border border-ink/15 px-3 py-3" value={splitType} onChange={(event) => setSplitType(event.target.value)}>
              <option value="equal">Equal</option>
              <option value="percentage">Percentage</option>
              <option value="custom">Custom amount</option>
            </select>
          </label>
        </div>

        <div className="mt-5">
          <h3 className="mb-2 text-sm font-black">Participants</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.members.map((member) => (
              <label key={member.id} className="flex items-center gap-3 rounded-md border border-ink/10 p-3">
                <input
                  type="checkbox"
                  checked={selected.has(member.id)}
                  onChange={(event) => {
                    const next = new Set(selected);
                    event.target.checked ? next.add(member.id) : next.delete(member.id);
                    setSelected(next);
                  }}
                />
                <span className="min-w-0 flex-1 font-bold">{member.name}</span>
                {splitType !== "equal" && selected.has(member.id) && (
                  <input
                    className="focus-ring w-24 rounded-md border border-ink/15 px-2 py-1"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={splitType === "percentage" ? "%" : "₹"}
                    value={values[member.id] || ""}
                    onChange={(event) => setValues({ ...values, [member.id]: event.target.value })}
                  />
                )}
              </label>
            ))}
          </div>
        </div>

        <button className="focus-ring mt-5 w-full rounded-md bg-mint px-4 py-3 font-black text-white">Save expense</button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-bold text-ink/70">{label}</span>
      <input className="focus-ring w-full rounded-md border border-ink/15 px-3 py-3" type={type} step="0.01" min={type === "number" ? "0.01" : undefined} value={value} onChange={(event) => onChange(event.target.value)} required />
    </label>
  );
}

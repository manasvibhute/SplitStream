import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Sparkles, X } from "lucide-react";
import { addExpense } from "../features/groupsSlice";
import { apiRequest } from "../lib/api";

export default function AddExpenseModal({ group, onClose }) {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.accessToken);
  const [naturalText, setNaturalText] = useState("");
  const [parseLoading, setParseLoading] = useState(false);
  const [parseError, setParseError] = useState("");
  const [clarification, setClarification] = useState(null);
  const [unknownParticipants, setUnknownParticipants] = useState([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [splitType, setSplitType] = useState("equal");
  const [category, setCategory] = useState("Food");
  const [selected, setSelected] = useState(
    () => new Set(group.members.map((member) => member.id))
  );
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
    await dispatch(addExpense({ groupId: group.id, expense: { description, amount: Number(amount), splitType, category, splits: participants } }));
    onClose();
  }

  async function parseNaturalExpense() {
    if (!naturalText.trim()) return;

    setParseLoading(true);
    setParseError("");
    setClarification(null);

    try {
      const response = await apiRequest("/api/expenses/parse", {
        method: "POST",
        token,
        body: JSON.stringify({
          text: naturalText.trim(),
          groupMembers: group.members.map((member) => ({ id: member.id, name: member.name })),
        }),
      });

      const parsed = response.parsed || {};
      // Show warning for unknown participants
      setUnknownParticipants(parsed.unknownParticipants || []);
      if (parsed.amount != null) {
        setAmount(String(parsed.amount));
      }
      if (parsed.description) setDescription(parsed.description);
      if (Array.isArray(parsed.participants) && parsed.participants.length > 0) {
        setSelected(new Set(parsed.participants));
      } else {
        setSelected(new Set()); // Clear selection
      }
      if (parsed.splitType === "equal") {
        setSplitType("equal");
        setValues({});
      }
      
      if (parsed.splitType === "unequal") {
        setSplitType("custom");
      
        const customValues = {};
      
        if (parsed.splitAmounts) {
          Object.entries(parsed.splitAmounts).forEach(([id, amount]) => {
            customValues[id] = String(amount);
          });
        }
      
        setValues(customValues);
      }

      setClarification(
        response.needsClarification || parsed.confidence === "low"
          ? parsed
          : null
      );
    } catch (error) {
      setParseError(error.message || "Could not parse this expense. Use the manual fields below.");
    } finally {
      setParseLoading(false);
    }
  }

  const needsAmount = clarification && !amount;
  const needsDescription = clarification && !description;
  const needsParticipants = clarification && selected.size === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-5 shadow-panel sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">Add expense</h2>
          <button type="button" className="focus-ring rounded-md p-2 hover:bg-ink/5" onClick={onClose} title="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5 rounded-lg border border-mint/25 bg-mint/10 p-3">
          <label className="mb-2 block text-sm font-black text-ink/70">
            <Sparkles className="inline h-4 w-4 text-mint" /> Natural-language entry
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="focus-ring min-w-0 flex-1 rounded-md border border-ink/15 px-3 py-3"
              value={naturalText}
              maxLength={300}
              onChange={(event) => setNaturalText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  parseNaturalExpense();
                }
              }}
              placeholder="Try: 'Paid 500 for dinner with Priya and Rahul'"
            />
            <button
              type="button"
              onClick={parseNaturalExpense}
              className="focus-ring rounded-md bg-mint px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={parseLoading || !naturalText.trim()}
            >
              {parseLoading ? "Parsing..." : "Parse"}
            </button>
          </div>
          {clarification && (
            <p className="mt-2 rounded-md bg-saffron/20 px-3 py-2 text-sm font-bold text-ink/70">
              Some details need review. Fix the highlighted fields before saving.
            </p>
          )}
          {unknownParticipants.length > 0 && (
            <p className="mt-2 rounded-md bg-yellow-100 px-3 py-2 text-sm font-bold text-yellow-800">
              These people are not in the group:{" "}
              {unknownParticipants.join(", ")}
            </p>
          )}
          {parseError && <p className="mt-2 rounded-md bg-coral/10 px-3 py-2 text-sm font-bold text-coral">{parseError}</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Description" value={description} onChange={setDescription} highlight={needsDescription} />
          <Field label="Amount" type="number" value={amount} onChange={setAmount} highlight={needsAmount} />
          <label>
            <span className="mb-1 block text-sm font-bold text-ink/70">Split type</span>
            <select className="focus-ring w-full rounded-md border border-ink/15 px-3 py-3" value={splitType} onChange={(event) => setSplitType(event.target.value)}>
              <option value="equal">Equal</option>
              <option value="percentage">Percentage</option>
              <option value="custom">Custom amount</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-bold text-ink/70">Category</span>
            <select className="focus-ring w-full rounded-md border border-ink/15 px-3 py-3" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option>Food</option>
              <option>Travel</option>
              <option>Stay</option>
              <option>Shopping</option>
              <option>Other</option>
            </select>
          </label>
        </div>

        <div className="mt-5">
          <h3 className="mb-2 text-sm font-black">Participants</h3>
          <div className={`grid gap-2 rounded-md ${needsParticipants ? "ring-2 ring-coral ring-offset-2" : ""} sm:grid-cols-2`}>
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

function Field({ label, value, onChange, type = "text", highlight = false }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-bold text-ink/70">{label}</span>
      <input className={`focus-ring w-full rounded-md border px-3 py-3 ${highlight ? "border-coral ring-2 ring-coral/20" : "border-ink/15"}`} type={type} step="0.01" min={type === "number" ? "0.01" : undefined} value={value} onChange={(event) => onChange(event.target.value)} required />
    </label>
  );
}

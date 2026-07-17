import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Plus, Users } from "lucide-react";
import { createGroup, fetchGroups } from "../features/groupsSlice";

export default function Dashboard({ activeGroupId, onSelectGroup }) {
  const dispatch = useDispatch();
  const { items, status } = useSelector((state) => state.groups);
  const [name, setName] = useState("");

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch]);

  async function submit(event) {
    event.preventDefault();
    if (!name.trim()) return;
    await dispatch(createGroup(name.trim()));
    setName("");
    dispatch(fetchGroups());
  }

  return (
    <aside className="space-y-4">
      <form onSubmit={submit} className="rounded-lg bg-white p-4 shadow-panel">
        <label className="block text-sm font-bold text-ink/70">New group</label>
        <div className="mt-2 flex gap-2">
          <input
            className="focus-ring min-w-0 flex-1 rounded-md border border-ink/15 px-3 py-2"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Goa trip"
          />
          <button className="focus-ring rounded-md bg-mint px-3 py-2 text-white" title="Create group">
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </form>

      <section className="rounded-lg bg-white p-2 shadow-panel">
        <div className="px-2 py-2 text-xs font-black uppercase text-ink/50">Your groups</div>
        {items.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-ink/55">
            {status === "loading" ? "Loading groups..." : "Create your first group to begin."}
          </p>
        )}
        <div className="space-y-1">
          {items.map((group) => (
            <button
              key={group.id}
              className={`focus-ring w-full rounded-md px-3 py-3 text-left transition ${
                activeGroupId === group.id ? "bg-ink text-white" : "hover:bg-ink/5"
              }`}
              onClick={() => onSelectGroup(group.id)}
            >
              <span className="block font-bold">{group.name}</span>
              <span className={`mt-1 flex items-center gap-1 text-xs ${activeGroupId === group.id ? "text-white/70" : "text-ink/50"}`}>
                <Users className="h-3.5 w-3.5" /> {group.memberCount} members
              </span>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

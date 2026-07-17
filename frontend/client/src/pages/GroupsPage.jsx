import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Plus, Users } from "lucide-react";
import GroupDetail from "../components/GroupDetail";
import { createGroup, fetchGroup, fetchGroups } from "../features/groupsSlice";
import { Card, EmptyState, PageHeader } from "../components/ui";

export default function GroupsPage({ activeGroupId, setActiveGroupId }) {
  const dispatch = useDispatch();
  const { items } = useSelector((state) => state.groups);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!activeGroupId && items.length > 0) setActiveGroupId(items[0].id);
  }, [activeGroupId, items, setActiveGroupId]);

  async function submit(event) {
    event.preventDefault();
    if (!name.trim()) return;
    const result = await dispatch(createGroup(name.trim()));
    await dispatch(fetchGroups());
    if (result.payload?.id) {
      setActiveGroupId(result.payload.id);
      dispatch(fetchGroup(result.payload.id));
    }
    setName("");
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Groups" subtitle="Create groups, manage members, split expenses, and settle balances." />
      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <aside className="space-y-4">
          <Card>
            <form onSubmit={submit}>
              <label className="block text-sm font-black text-ink/65">New group</label>
              <div className="mt-2 flex gap-2">
                <input className="focus-ring min-w-0 flex-1 rounded-md border border-ink/15 px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} placeholder="Goa trip" />
                <button className="focus-ring rounded-md bg-mint px-3 py-2 text-white" title="Create group">
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </form>
          </Card>
          <Card>
            <div className="mb-3 text-sm font-black uppercase text-ink/45">Your groups</div>
            {items.length === 0 ? (
              <EmptyState icon={Users} title="No groups" message="Create your first group." />
            ) : (
              <div className="space-y-2">
                {items.map((group) => (
                  <button
                    key={group.id}
                    className={`focus-ring w-full rounded-md p-3 text-left ${
                      activeGroupId === group.id ? "bg-ink text-white" : "border border-ink/10 hover:bg-ink/5"
                    }`}
                    onClick={() => setActiveGroupId(group.id)}
                  >
                    <span className="block font-black">{group.name}</span>
                    <span className={activeGroupId === group.id ? "text-sm text-white/65" : "text-sm text-ink/50"}>{group.memberCount} members</span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </aside>
        <GroupDetail groupId={activeGroupId} />
      </div>
    </div>
  );
}

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Lock, Save, User } from "lucide-react";
import { changePassword, updateProfile } from "../features/authSlice";
import { Card, formatMoney, PageHeader, StatCard } from "../components/ui";

export default function SettingsPage({ analytics }) {
  const dispatch = useDispatch();
  const { user, error } = useSelector((state) => state.auth);
  const [name, setName] = useState(user?.name || "");
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const stats = analytics?.dashboard || {};

  async function saveProfile(event) {
    event.preventDefault();
    dispatch(updateProfile({ name }));
  }

  async function savePassword(event) {
    event.preventDefault();
    await dispatch(changePassword(passwords));
    setPasswords({ currentPassword: "", newPassword: "" });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Settings" subtitle="Profile, password, and lifetime SplitStream stats." />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Total groups" value={stats.activeGroups || 0} icon={User} />
        <StatCard label="Expenses logged" value={stats.expensesLogged || 0} icon={Save} />
        <StatCard label="Lifetime settled" value={formatMoney(stats.lifetimeSettled)} icon={Lock} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-black">Profile</h2>
          <form onSubmit={saveProfile}>
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-ink/60">Name</span>
              <input className="focus-ring w-full rounded-md border border-ink/15 px-3 py-3" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <button className="focus-ring mt-4 rounded-md bg-mint px-4 py-3 text-sm font-black text-white">
              <Save className="inline h-4 w-4" /> Save profile
            </button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-black">Change password</h2>
          <form onSubmit={savePassword} className="space-y-3">
            <input
              className="focus-ring w-full rounded-md border border-ink/15 px-3 py-3"
              type="password"
              placeholder="Current password"
              value={passwords.currentPassword}
              onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })}
            />
            <input
              className="focus-ring w-full rounded-md border border-ink/15 px-3 py-3"
              type="password"
              placeholder="New password"
              value={passwords.newPassword}
              onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })}
            />
            {error && <p className="rounded-md bg-coral/10 px-3 py-2 text-sm font-bold text-coral">{error}</p>}
            <button className="focus-ring rounded-md bg-ink px-4 py-3 text-sm font-black text-white">
              <Lock className="inline h-4 w-4" /> Update password
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}

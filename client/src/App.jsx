import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { LogOut, Plus, ReceiptText, Users, WalletCards } from "lucide-react";
import { logout } from "./features/authSlice";
import { fetchGroup, fetchGroups, setCurrentFromSocket } from "./features/groupsSlice";
import { clearToast, showToast } from "./features/toastSlice";
import { getSocket } from "./lib/socket";
import AuthScreen from "./components/AuthScreen";
import Dashboard from "./components/Dashboard";
import GroupDetail from "./components/GroupDetail";
import Toast from "./components/Toast";

export default function App() {
  const dispatch = useDispatch();
  const { user, accessToken } = useSelector((state) => state.auth);
  const { items, current } = useSelector((state) => state.groups);
  const toast = useSelector((state) => state.toast.message);
  const [activeGroupId, setActiveGroupId] = useState(null);

  useEffect(() => {
    if (accessToken) dispatch(fetchGroups());
  }, [accessToken, dispatch]);

  useEffect(() => {
    if (!activeGroupId && items.length > 0) setActiveGroupId(items[0].id);
  }, [activeGroupId, items]);

  useEffect(() => {
    if (activeGroupId) dispatch(fetchGroup(activeGroupId));
  }, [activeGroupId, dispatch]);

  useEffect(() => {
    if (!accessToken || !activeGroupId) return undefined;

    const socket = getSocket(accessToken);
    socket.emit("group:join", activeGroupId);
    const handlers = {
      "expense:added": "New expense added",
      "expense:deleted": "Expense deleted",
      "settlement:made": "Settlement recorded",
      "member:joined": "New member joined",
    };

    Object.entries(handlers).forEach(([eventName, message]) => {
      socket.on(eventName, (snapshot) => {
        dispatch(setCurrentFromSocket(snapshot));
        dispatch(fetchGroups());
        dispatch(showToast(message));
      });
    });

    return () => {
      socket.emit("group:leave", activeGroupId);
      Object.keys(handlers).forEach((eventName) => socket.off(eventName));
    };
  }, [accessToken, activeGroupId, dispatch]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => dispatch(clearToast()), 3200);
    return () => clearTimeout(timer);
  }, [dispatch, toast]);

  const stats = useMemo(() => {
    const positive = current?.balances?.raw?.filter((item) => item.balance > 0).length || 0;
    const negative = current?.balances?.raw?.filter((item) => item.balance < 0).length || 0;
    return { positive, negative };
  }, [current]);

  if (!user) return <AuthScreen />;

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <WalletCards className="h-7 w-7 text-mint" />
              <h1 className="text-2xl font-black tracking-normal">SplitStream</h1>
            </div>
            <p className="text-sm text-ink/60">Live shared expenses for {user.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Pill icon={ReceiptText} label={`${current?.expenses?.length || 0} expenses`} />
            <Pill icon={Users} label={`${current?.members?.length || 0} members`} />
            <Pill icon={Plus} label={`${stats.positive}/${stats.negative} balanced`} />
            <button
              className="focus-ring rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-ink hover:text-white"
              onClick={() => dispatch(logout())}
            >
              <LogOut className="inline h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[320px_1fr]">
        <Dashboard activeGroupId={activeGroupId} onSelectGroup={setActiveGroupId} />
        <GroupDetail groupId={activeGroupId} />
      </main>
      <Toast message={toast} />
    </div>
  );
}

function Pill({ icon: Icon, label }) {
  return (
    <span className="hidden items-center gap-1 rounded-full border border-ink/10 bg-[#f2f7f1] px-3 py-2 text-xs font-bold text-ink/70 sm:inline-flex">
      <Icon className="h-4 w-4" />
      {label}
    </span>
  );
}

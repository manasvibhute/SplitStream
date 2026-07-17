import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import AuthScreen from "./components/AuthScreen";
import AppShell from "./components/AppShell";
import Toast from "./components/Toast";
import { fetchAnalytics } from "./features/analyticsSlice";
import { fetchGroup, fetchGroups, setCurrentFromSocket } from "./features/groupsSlice";
import { clearToast, showToast } from "./features/toastSlice";
import { getSocket } from "./lib/socket";
import ActivityPage from "./pages/ActivityPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import DashboardPage from "./pages/DashboardPage";
import GroupsPage from "./pages/GroupsPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  const dispatch = useDispatch();
  const { user, accessToken } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.groups);
  const { data: analytics, status: analyticsStatus } = useSelector((state) => state.analytics);
  const toast = useSelector((state) => state.toast.message);
  const [page, setPage] = useState("dashboard");
  const [activeGroupId, setActiveGroupId] = useState(null);

  useEffect(() => {
    if (!accessToken) return;
    dispatch(fetchGroups());
    dispatch(fetchAnalytics());
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
        dispatch(fetchAnalytics());
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

  if (!user) return <AuthScreen />;

  return (
    <AppShell page={page} setPage={setPage}>
      {page === "dashboard" && (
        <DashboardPage
          analytics={analytics}
          status={analyticsStatus}
          onCreateGroup={() => setPage("groups")}
          onOpenGroup={(groupId) => {
            setActiveGroupId(groupId);
            setPage("groups");
          }}
        />
      )}
      {page === "groups" && <GroupsPage activeGroupId={activeGroupId} setActiveGroupId={setActiveGroupId} />}
      {page === "analytics" && <AnalyticsPage />}
      {page === "activity" && <ActivityPage analytics={analytics} />}
      {page === "settings" && <SettingsPage analytics={analytics} />}
      <Toast message={toast} />
    </AppShell>
  );
}

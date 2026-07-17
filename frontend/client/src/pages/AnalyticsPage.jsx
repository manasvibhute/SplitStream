import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchAnalytics } from "../features/analyticsSlice";
import { Card, EmptyState, formatMoney, PageHeader } from "../components/ui";
import { BarChart3 } from "lucide-react";

const colors = ["#2fbf71", "#ef6f6c", "#f4b942", "#3b82f6", "#17202a"];

export default function AnalyticsPage() {
  const dispatch = useDispatch();
  const { data, status } = useSelector((state) => state.analytics);
  const groups = useSelector((state) => state.groups.items);
  const [filters, setFilters] = useState({ groupId: "", from: "", to: "" });

  useEffect(() => {
    dispatch(fetchAnalytics(filters));
  }, [dispatch, filters]);

  const charts = data?.charts || {};
  const hasCharts =
    charts.spendingOverTime?.length || charts.spendingByCategory?.length || charts.spendingByGroup?.length || charts.paidVsOwed?.length;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Analytics" subtitle="Expense trends across groups, categories, and time." />
      <Card className="mb-6">
        <div className="grid gap-3 md:grid-cols-3">
          <label>
            <span className="mb-1 block text-sm font-bold text-ink/60">Group</span>
            <select className="focus-ring w-full rounded-md border border-ink/15 px-3 py-2" value={filters.groupId} onChange={(event) => setFilters({ ...filters, groupId: event.target.value })}>
              <option value="">All groups</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-bold text-ink/60">From</span>
            <input className="focus-ring w-full rounded-md border border-ink/15 px-3 py-2" type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-bold text-ink/60">To</span>
            <input className="focus-ring w-full rounded-md border border-ink/15 px-3 py-2" type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
          </label>
        </div>
      </Card>

      {!hasCharts && status !== "loading" ? (
        <EmptyState icon={BarChart3} title="No analytics yet" message="Add categorized expenses to populate charts." />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <ChartCard title="Spending over time">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={charts.spendingOverTime || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatMoney(value)} />
                <Area type="monotone" dataKey="spending" stroke="#2fbf71" fill="#2fbf71" fillOpacity={0.18} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Spending by category">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={charts.spendingByCategory || []} dataKey="value" nameKey="name" innerRadius={64} outerRadius={100} paddingAngle={3}>
                  {(charts.spendingByCategory || []).map((entry, index) => (
                    <Cell key={entry.name} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatMoney(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Spending by group">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={charts.spendingByGroup || []} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={90} />
                <Tooltip formatter={(value) => formatMoney(value)} />
                <Bar dataKey="amount" fill="#17202a" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="You paid vs. you owe">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={charts.paidVsOwed || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatMoney(value)} />
                <Legend />
                <Bar dataKey="paid" stackId="a" fill="#2fbf71" />
                <Bar dataKey="owed" stackId="a" fill="#ef6f6c" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <Card>
      <h2 className="mb-4 text-lg font-black">{title}</h2>
      {children}
    </Card>
  );
}

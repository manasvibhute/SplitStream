import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { LogIn, UserPlus, WalletCards } from "lucide-react";
import { login, signup } from "../features/authSlice";

export default function AuthScreen() {
  const dispatch = useDispatch();
  const { status, error } = useSelector((state) => state.auth);
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  function submit(event) {
    event.preventDefault();
    dispatch(mode === "signup" ? signup(form) : login({ email: form.email, password: form.password }));
  }

  return (
    <main className="grid min-h-screen bg-[#f8faf7] lg:grid-cols-[1fr_460px]">
      <section className="flex min-h-[45vh] items-end bg-[linear-gradient(rgba(23,32,42,.25),rgba(23,32,42,.42)),url('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center px-6 py-10 text-white lg:min-h-screen lg:px-12">
        <div className="max-w-2xl">
          <div className="mb-4 flex items-center gap-3">
            <WalletCards className="h-9 w-9" />
            <span className="text-3xl font-black">SplitStream</span>
          </div>
          <h1 className="text-4xl font-black leading-tight sm:text-6xl">Shared costs, settled live.</h1>
          <p className="mt-4 max-w-xl text-lg text-white/85">
            Create a group, add expenses, and watch balances update instantly across every open browser.
          </p>
        </div>
      </section>

      <section className="flex items-center px-5 py-8">
        <form onSubmit={submit} className="w-full rounded-lg bg-white p-6 shadow-panel">
          <div className="mb-5 flex rounded-md bg-ink/5 p-1">
            <button
              type="button"
              className={`focus-ring flex-1 rounded px-3 py-2 text-sm font-bold ${mode === "login" ? "bg-white shadow-sm" : ""}`}
              onClick={() => setMode("login")}
            >
              <LogIn className="inline h-4 w-4" /> Login
            </button>
            <button
              type="button"
              className={`focus-ring flex-1 rounded px-3 py-2 text-sm font-bold ${mode === "signup" ? "bg-white shadow-sm" : ""}`}
              onClick={() => setMode("signup")}
            >
              <UserPlus className="inline h-4 w-4" /> Signup
            </button>
          </div>

          {mode === "signup" && (
            <Field label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} />
          )}
          <Field label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
          <Field
            label="Password"
            type="password"
            value={form.password}
            onChange={(password) => setForm({ ...form, password })}
          />

          {error && <p className="mb-3 rounded-md bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">{error}</p>}

          <button className="focus-ring w-full rounded-md bg-ink px-4 py-3 font-bold text-white hover:bg-mint" disabled={status === "loading"}>
            {status === "loading" ? "Working..." : mode === "signup" ? "Create account" : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block text-sm font-bold text-ink/70">{label}</span>
      <input
        className="focus-ring w-full rounded-md border border-ink/15 px-3 py-3"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  );
}

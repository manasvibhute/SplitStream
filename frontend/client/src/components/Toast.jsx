export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 right-5 rounded-md bg-ink px-4 py-3 text-sm font-bold text-white shadow-panel">
      {message}
    </div>
  );
}

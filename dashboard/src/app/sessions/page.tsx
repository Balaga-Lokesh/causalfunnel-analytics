export default function SessionsPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">Sessions</h1>
      <p className="mt-1 text-sm text-zinc-600">All tracked sessions with their total events.</p>

      {/* TODO: fetch getSessions() and render a table linking to /sessions/[sessionId] */}
    </section>
  );
}

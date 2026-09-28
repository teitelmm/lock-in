export function SetupNotice() {
  return (
    <div className="panel border-warn/40">
      <h2 className="text-lg font-bold">Almost there: connect Supabase</h2>
      <p className="mt-2 text-muted">
        Lock In needs a Supabase project for sign-in and saving your study sets. Copy <code>.env.example</code> to{" "}
        <code>.env.local</code>, fill in your keys, run the SQL in <code>supabase/migrations/0001_init.sql</code>, and
        restart the dev server. The README has step-by-step instructions.
      </p>
    </div>
  );
}

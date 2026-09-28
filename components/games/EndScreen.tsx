import Link from "next/link";

export function EndScreen({
  setId,
  headline,
  score,
  detail,
  onReplay,
  replayLabel = "Play again",
  extraAction,
  children,
}: {
  setId: string;
  headline: string;
  score: string;
  detail?: string;
  onReplay: () => void;
  replayLabel?: string;
  extraAction?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="panel py-10 text-center">
        <div className="text-lg font-bold text-muted">{headline}</div>
        <div className="pop mt-2 text-5xl font-extrabold text-accent">{score}</div>
        {detail && <div className="mt-2 text-muted">{detail}</div>}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {extraAction}
          <button className="btn btn-primary" onClick={onReplay} autoFocus>
            {replayLabel}
          </button>
          <Link href={`/sets/${setId}`} className="btn">
            Back to set
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}

export function cheer(pct: number): string {
  if (pct >= 0.9) return "You're locked in 🔒";
  if (pct >= 0.7) return "Nice work 💪";
  if (pct >= 0.5) return "Getting there 📈";
  return "Keep practicing, you've got this 🌱";
}

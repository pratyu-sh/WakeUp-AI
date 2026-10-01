import { UserX } from "lucide-react";

export function CameraLostOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="flex flex-col items-center text-center px-6">
        <div className="mb-5 grid h-20 w-20 place-items-center rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.3)] animate-pulse">
          <UserX size={40} />
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">
          I can&apos;t see you
        </h2>

        <p className="mt-2 max-w-xs text-sm font-medium text-neutral-300 leading-relaxed drop-shadow">
          Step back into frame so the camera can track your full body.
        </p>

        <div className="mt-6 flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 font-mono text-xs text-white/80 backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
          <span>Challenge paused · Reps saved</span>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * MrRecorder Teleprompter — floating always-on-top script window.
 * Paste your script, hit play, and it auto-scrolls while you record.
 */
export function Teleprompter() {
	const [script, setScript] = useState(
		"Apna script yahan likhein...\n\nTeleprompter aap ke bolne ki raftaar se khud scroll karega.",
	);
	const [playing, setPlaying] = useState(false);
	const [speed, setSpeed] = useState(30); // px per second
	const [fontSize, setFontSize] = useState(28);
	const [editing, setEditing] = useState(true);
	const scrollRef = useRef<HTMLDivElement>(null);
	const rafRef = useRef<number>(0);
	const lastTs = useRef<number>(0);

	const tick = useCallback(
		(ts: number) => {
			if (lastTs.current === 0) lastTs.current = ts;
			const dt = (ts - lastTs.current) / 1000;
			lastTs.current = ts;
			const el = scrollRef.current;
			if (el) {
				el.scrollTop += speed * dt;
				if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
					setPlaying(false);
					return;
				}
			}
			rafRef.current = requestAnimationFrame(tick);
		},
		[speed],
	);

	useEffect(() => {
		if (playing) {
			lastTs.current = 0;
			rafRef.current = requestAnimationFrame(tick);
		} else {
			cancelAnimationFrame(rafRef.current);
		}
		return () => cancelAnimationFrame(rafRef.current);
	}, [playing, tick]);

	const reset = () => {
		if (scrollRef.current) scrollRef.current.scrollTop = 0;
		setPlaying(false);
	};

	return (
		<div className="flex h-screen flex-col bg-[#111111] text-[#F5EFE3]">
			{/* title bar (draggable) */}
			<div
				className="flex items-center justify-between px-3 py-2"
				style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
			>
				<span className="text-xs font-semibold tracking-wide opacity-70">
					MrRecorder Teleprompter
				</span>
				<div className="flex gap-1" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
					<button
						onClick={() => window.electronAPI?.teleprompterClose?.()}
						className="rounded px-2 py-0.5 text-xs hover:bg-white/10"
					>
						✕
					</button>
				</div>
			</div>

			{/* script view */}
			<div className="relative flex-1 overflow-hidden">
				{editing ? (
					<textarea
						value={script}
						onChange={(e) => setScript(e.target.value)}
						className="h-full w-full resize-none bg-transparent p-4 outline-none"
						style={{ fontSize }}
						placeholder="Script yahan likhein..."
					/>
				) : (
					<div
						ref={scrollRef}
						className="h-full overflow-y-auto whitespace-pre-wrap p-4 leading-relaxed"
						style={{ fontSize }}
					>
						{script}
						<div className="h-[60%]" />
					</div>
				)}
				{/* reading guide line */}
				{!editing && (
					<div className="pointer-events-none absolute left-0 right-0 top-1/3 border-t-2 border-[#E53946]/60" />
				)}
			</div>

			{/* controls */}
			<div className="flex items-center gap-2 border-t border-white/10 px-3 py-2 text-xs">
				<button
					onClick={() => setEditing(!editing)}
					className="rounded bg-white/10 px-2 py-1 hover:bg-white/20"
				>
					{editing ? "▶ Start" : "✎ Edit"}
				</button>
				{!editing && (
					<>
						<button
							onClick={() => setPlaying(!playing)}
							className="rounded bg-[#E53946] px-3 py-1 font-semibold text-white hover:bg-[#E53946]/80"
						>
							{playing ? "⏸ Pause" : "▶ Play"}
						</button>
						<button onClick={reset} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">
							↺
						</button>
						<label className="ml-1 opacity-70">Speed</label>
						<input
							type="range"
							min={10}
							max={120}
							value={speed}
							onChange={(e) => setSpeed(Number(e.target.value))}
							className="w-20"
						/>
					</>
				)}
				<label className="ml-auto opacity-70">Font</label>
				<input
					type="range"
					min={16}
					max={48}
					value={fontSize}
					onChange={(e) => setFontSize(Number(e.target.value))}
					className="w-20"
				/>
			</div>
		</div>
	);
}

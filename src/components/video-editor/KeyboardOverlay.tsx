import { useEffect, useState } from "react";

interface KeyPress {
	label: string;
	timestampMs: number;
}

interface KeyboardOverlayProps {
	videoPath: string | null;
	currentTimeMs: number;
	enabled: boolean;
}

/**
 * MrRecorder keyboard overlay — shows keys pressed during the recording
 * as floating badges on the preview, synced to playback time.
 * Each badge stays visible for 1.2s after its timestamp.
 */
export function KeyboardOverlay({ videoPath, currentTimeMs, enabled }: KeyboardOverlayProps) {
	const [events, setEvents] = useState<KeyPress[]>([]);

	useEffect(() => {
		if (!videoPath) {
			setEvents([]);
			return;
		}
		let cancelled = false;
		window.electronAPI
			.loadKeyPresses(videoPath)
			.then((res) => {
				if (!cancelled && res.success) setEvents(res.events ?? []);
			})
			.catch(() => {
				if (!cancelled) setEvents([]);
			});
		return () => {
			cancelled = true;
		};
	}, [videoPath]);

	if (!enabled || events.length === 0) return null;

	const visible = events.filter(
		(e) => currentTimeMs >= e.timestampMs && currentTimeMs - e.timestampMs < 1200,
	);
	if (visible.length === 0) return null;

	return (
		<div className="pointer-events-none absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
			{visible.slice(-4).map((e, i) => (
				<kbd
					key={`${e.timestampMs}-${i}`}
					className="rounded-lg border border-white/20 bg-black/70 px-3 py-1.5 font-mono text-sm font-semibold text-white shadow-lg backdrop-blur-sm"
				>
					{e.label}
				</kbd>
			))}
		</div>
	);
}

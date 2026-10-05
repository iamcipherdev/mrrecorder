import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import type { TrimRegion } from "./types";

interface SilenceInterval {
	startSec: number;
	endSec: number;
}

interface SilenceRemoverProps {
	videoPath: string | null;
	durationMs: number;
	existingTrims: TrimRegion[];
	onApplyTrims: (trims: TrimRegion[]) => void;
}

function formatTime(sec: number): string {
	const m = Math.floor(sec / 60);
	const s = Math.floor(sec % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * MrRecorder Silence Remover — detects silent stretches in the recording
 * via ffmpeg and converts them into trim regions (cut on export).
 */
export function SilenceRemover({ videoPath, durationMs, existingTrims, onApplyTrims }: SilenceRemoverProps) {
	const [open, setOpen] = useState(false);
	const [detecting, setDetecting] = useState(false);
	const [silences, setSilences] = useState<SilenceInterval[]>([]);
	const [selected, setSelected] = useState<Set<number>>(new Set());
	const [minDuration, setMinDuration] = useState(1.5);

	const handleDetect = async () => {
		if (!videoPath) {
			toast.error("No video loaded");
			return;
		}
		setDetecting(true);
		try {
			const result = await window.electronAPI.detectSilences({
				videoPath,
				minDurationSec: minDuration,
			});
			if (!result.success) {
				toast.error(result.error ?? "Silence detection failed");
				return;
			}
			const found = (result.silences ?? []).map((s) => ({
				startSec: s.startSec,
				// clamp trailing silence to video duration
				endSec: Math.min(s.endSec, durationMs / 1000),
			}));
			setSilences(found);
			setSelected(new Set(found.map((_, i) => i)));
			if (found.length === 0) {
				toast.info("No silences found — nice clean recording!");
			}
		} catch (err) {
			toast.error("Silence detection failed");
			console.warn("[MrRecorder] silence detect failed:", err);
		} finally {
			setDetecting(false);
		}
	};

	const toggleSelect = (i: number) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(i)) next.delete(i);
			else next.add(i);
			return next;
		});
	};

	const handleApply = () => {
		const newTrims: TrimRegion[] = silences
			.filter((_, i) => selected.has(i))
			.map((s, i) => ({
				id: `silence-trim-${Date.now()}-${i}`,
				startMs: Math.round(s.startSec * 1000),
				endMs: Math.round(s.endSec * 1000),
			}));
		// avoid duplicating trims that already overlap existing ones
		const filtered = newTrims.filter(
			(nt) =>
				!existingTrims.some(
					(et) => Math.abs(et.startMs - nt.startMs) < 500 && Math.abs(et.endMs - nt.endMs) < 500,
				),
		);
		onApplyTrims([...existingTrims, ...filtered]);
		toast.success(`${filtered.length} silence(s) marked for removal`);
		setOpen(false);
	};

	const totalCutSec = silences
		.filter((_, i) => selected.has(i))
		.reduce((sum, s) => sum + (s.endSec - s.startSec), 0);

	return (
		<>
			<Button variant="ghost" size="sm" onClick={() => { setOpen(true); setSilences([]); }}>
				Remove Silences
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Silence Remover</DialogTitle>
						<DialogDescription>
							Find quiet stretches in your recording and cut them out on export.
						</DialogDescription>
					</DialogHeader>
					<div className="flex items-center gap-3 py-2">
						<label className="text-sm">Minimum silence (sec)</label>
						<input
							type="number"
							min={0.5}
							max={10}
							step={0.5}
							value={minDuration}
							onChange={(e) => setMinDuration(Number(e.target.value) || 1.5)}
							className="w-20 rounded border px-2 py-1 text-sm"
						/>
						<Button size="sm" onClick={handleDetect} disabled={detecting}>
							{detecting ? "Detecting…" : "Detect"}
						</Button>
					</div>
					{silences.length > 0 && (
						<div className="max-h-64 overflow-y-auto rounded border p-2">
							{silences.map((s, i) => (
								<label key={i} className="flex cursor-pointer items-center gap-2 py-1 text-sm">
									<input
										type="checkbox"
										checked={selected.has(i)}
										onChange={() => toggleSelect(i)}
									/>
									<span>
										{formatTime(s.startSec)} → {formatTime(s.endSec)}
										<span className="ml-2 text-xs text-muted-foreground">
											({(s.endSec - s.startSec).toFixed(1)}s)
										</span>
									</span>
								</label>
							))}
						</div>
					)}
					<DialogFooter>
						<div className="mr-auto text-sm text-muted-foreground">
							{selected.size > 0 && `Will cut ~${totalCutSec.toFixed(1)}s`}
						</div>
						<Button variant="outline" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleApply} disabled={selected.size === 0}>
							Cut {selected.size} silence(s)
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

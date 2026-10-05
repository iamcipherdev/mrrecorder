import { spawn } from "node:child_process";
import { ipcMain } from "electron";
import { getFfmpegBinaryPath } from "../ffmpeg/binary";

export interface SilenceInterval {
	startSec: number;
	endSec: number;
}

export interface DetectSilencesResult {
	success: boolean;
	silences?: SilenceInterval[];
	error?: string;
}

/**
 * Detects silent intervals in a video's audio track using ffmpeg's
 * silencedetect filter. Only intervals longer than minDurationSec
 * are returned.
 */
export function registerSilenceDetectionHandlers() {
	ipcMain.handle(
		"mrrecorder:detect-silences",
		async (
			_,
			req: { videoPath: string; minDurationSec?: number; noiseDb?: number },
		): Promise<DetectSilencesResult> => {
			try {
				const { videoPath } = req;
				const minDurationSec = Math.max(0.3, req.minDurationSec ?? 1.0);
				const noiseDb = req.noiseDb ?? -30;

				let ffmpegPath: string;
				try {
					ffmpegPath = getFfmpegBinaryPath();
				} catch {
					return {
						success: false,
						error: "ffmpeg not found — install ffmpeg to use Silence Remover",
					};
				}

				const stderr = await new Promise<string>((resolve, reject) => {
					const proc = spawn(
						ffmpegPath,
						[
							"-hide_banner",
							"-i",
							videoPath,
							"-af",
							`silencedetect=noise=${noiseDb}dB:d=${minDurationSec}`,
							"-f",
							"null",
							"-",
						],
						{ windowsHide: true },
					);
					let out = "";
					proc.stderr?.on("data", (d) => {
						out += d.toString();
					});
					proc.on("error", reject);
					proc.on("close", (_code) => {
						// silencedetect always "processes" the file; non-zero exit
						// usually means no audio stream — treat output as authoritative
						resolve(out);
					});
				});

				const silences: SilenceInterval[] = [];
				const startRe = /silence_start:\s*([\d.]+)/g;
				const endRe = /silence_end:\s*([\d.]+)/g;
				const starts: number[] = [];
				const ends: number[] = [];
				let m: RegExpExecArray | null;
				while ((m = startRe.exec(stderr)) !== null) starts.push(parseFloat(m[1]));
				while ((m = endRe.exec(stderr)) !== null) ends.push(parseFloat(m[1]));

				// Pair starts with ends in order; a trailing start without end
				// extends to end of stream (use a large sentinel, UI clamps it)
				for (let i = 0; i < starts.length; i++) {
					const start = starts[i];
					const end = ends[i] ?? start + 3600;
					if (end - start >= minDurationSec * 0.9) {
						silences.push({ startSec: start, endSec: end });
					}
				}

				return { success: true, silences };
			} catch (err) {
				return {
					success: false,
					error: err instanceof Error ? err.message : String(err),
				};
			}
		},
	);
}

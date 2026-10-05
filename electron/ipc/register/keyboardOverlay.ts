import fs from "node:fs/promises";
import { ipcMain } from "electron";
import { getKeyPressSidecarPath, type KeyPressEvent } from "../keyboard/capture";

export interface LoadKeyPressesResult {
	success: boolean;
	events?: KeyPressEvent[];
}

/**
 * MrRecorder keyboard overlay — loads the timestamped key-press sidecar
 * written alongside a recording.
 */
export function registerKeyboardOverlayHandlers() {
	ipcMain.handle(
		"mrrecorder:load-key-presses",
		async (_, videoPath: string): Promise<LoadKeyPressesResult> => {
			try {
				const sidecarPath = getKeyPressSidecarPath(videoPath);
				const raw = await fs.readFile(sidecarPath, "utf-8");
				const parsed = JSON.parse(raw) as { events?: KeyPressEvent[] };
				return { success: true, events: parsed.events ?? [] };
			} catch {
				return { success: true, events: [] };
			}
		},
	);
}

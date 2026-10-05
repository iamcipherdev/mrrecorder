import { ipcMain } from "electron";
import {
	closeTeleprompterWindow,
	getTeleprompterWindow,
	toggleTeleprompterWindow,
} from "../../windows";

/**
 * MrRecorder Teleprompter window controls.
 */
export function registerTeleprompterHandlers() {
	ipcMain.handle("mrrecorder:teleprompter-toggle", () => {
		toggleTeleprompterWindow();
		return { success: true };
	});

	ipcMain.handle("mrrecorder:teleprompter-close", () => {
		closeTeleprompterWindow();
		return { success: true };
	});

	ipcMain.handle("mrrecorder:teleprompter-visible", () => {
		const win = getTeleprompterWindow();
		return { visible: Boolean(win && win.isVisible()) };
	});
}

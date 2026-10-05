import fs from "node:fs/promises";
import path from "node:path";
import { BrowserWindow } from "electron";

export interface KeyPressEvent {
	/** Human-readable key label, e.g. "Ctrl+C", "Enter", "a" */
	label: string;
	/** ms since recording started */
	timestampMs: number;
}

let keyEvents: KeyPressEvent[] = [];
let captureStartMs = 0;
let isCapturing = false;
let keydownHandler: ((event: unknown) => void) | null = null;
let hookRef: {
	on?: (event: string, handler: (e: unknown) => void) => void;
	off?: (event: string, handler: (e: unknown) => void) => void;
	removeListener?: (event: string, handler: (e: unknown) => void) => void;
} | null = null;

function formatKeyLabel(event: {
	keycode?: number;
	key?: string;
	ctrlKey?: boolean;
	shiftKey?: boolean;
	altKey?: boolean;
	metaKey?: boolean;
}): string {
	const parts: string[] = [];
	if (event.ctrlKey) parts.push("Ctrl");
	if (event.altKey) parts.push("Alt");
	if (event.shiftKey) parts.push("Shift");
	if (event.metaKey) parts.push("Meta");

	let key = event.key ?? "";
	// uiohook-napi keycode fallback names for common keys
	if (!key && typeof event.keycode === "number") {
		const names: Record<number, string> = {
			28: "Enter",
			1: "Esc",
			57: "Space",
			14: "Backspace",
			15: "Tab",
			42: "Shift",
			29: "Ctrl",
			56: "Alt",
		};
		key = names[event.keycode] ?? `Key${event.keycode}`;
	}
	if (key === " ") key = "Space";
	// avoid duplicating modifier-only presses
	if (["Control", "Shift", "Alt", "Meta"].includes(key)) return parts.join("+");
	if (key) parts.push(key.length === 1 ? key.toUpperCase() : key);
	return parts.join("+") || "Key";
}

function broadcastKeyPress(press: KeyPressEvent) {
	for (const win of BrowserWindow.getAllWindows()) {
		try {
			if (!win.isDestroyed()) {
				win.webContents.send("mrrecorder:key-press", press);
			}
		} catch {
			// window gone — ignore
		}
	}
}

/**
 * Attaches a keydown listener to an already-loaded uiohook instance.
 * Called from the interaction capture startup so keyboard and cursor
 * hooks share one lifecycle.
 */
export function attachKeyboardCapture(
	hook: {
		on?: (event: string, handler: (e: unknown) => void) => void;
		off?: (event: string, handler: (e: unknown) => void) => void;
		removeListener?: (event: string, handler: (e: unknown) => void) => void;
	} | null,
): void {
	detachKeyboardCapture();
	if (!hook || typeof hook.on !== "function") return;
	hookRef = hook;
	keyEvents = [];
	captureStartMs = Date.now();
	isCapturing = true;

	keydownHandler = (event: unknown) => {
		if (!isCapturing) return;
		const label = formatKeyLabel((event ?? {}) as Record<string, unknown>);
		if (!label || label === "Key") return;
		const press: KeyPressEvent = {
			label,
			timestampMs: Date.now() - captureStartMs,
		};
		keyEvents.push(press);
		broadcastKeyPress(press);
	};

	hook.on("keydown", keydownHandler);
}

export function detachKeyboardCapture(): void {
	isCapturing = false;
	if (hookRef && keydownHandler) {
		try {
			if (typeof hookRef.off === "function") hookRef.off("keydown", keydownHandler);
			else if (typeof hookRef.removeListener === "function")
				hookRef.removeListener("keydown", keydownHandler);
		} catch {
			// ignore
		}
	}
	keydownHandler = null;
	hookRef = null;
}

/**
 * Writes collected key presses next to the recording as a sidecar file.
 * Returns the sidecar path, or null when there is nothing to save.
 */
export async function saveKeyPressSidecar(videoPath: string): Promise<string | null> {
	const events = keyEvents;
	keyEvents = [];
	if (events.length === 0) return null;
	try {
		const parsed = path.parse(videoPath);
		const sidecarPath = path.join(parsed.dir, `${parsed.name}.keys.json`);
		await fs.writeFile(sidecarPath, JSON.stringify({ version: 1, events }, null, 1));
		return sidecarPath;
	} catch {
		return null;
	}
}

export function getKeyPressSidecarPath(videoPath: string): string {
	const parsed = path.parse(videoPath);
	return path.join(parsed.dir, `${parsed.name}.keys.json`);
}

import { useEffect, useMemo, useState } from "react";
import type { ExportPreset } from "../exportPresets";
import type {
	ExportBackendPreference,
	ExportEncodingMode,
	ExportFormat,
	ExportMp4FrameRate,
	ExportPipelineModel,
	ExportQuality,
	GifFrameRate,
	GifSizePreset,
} from "@/lib/exporter";
import { projectCaptionCues } from "../captionTimeline";
import { saveEditorPreferences, type EditorPreferences } from "../editorPreferences";
import type { CaptionCue, ClipRegion } from "../types";

const DEFAULT_MP4_EXPORT_FRAME_RATE: ExportMp4FrameRate = 30;

export function useExportSettings(
	preferences: EditorPreferences,
	autoCaptions: CaptionCue[],
	clips: ClipRegion[],
) {
	const [includeCaptionSidecar, setIncludeCaptionSidecar] = useState(
		preferences.includeCaptionSidecar,
	);
	const [publishDestination, setPublishDestination] = useState(preferences.publishDestination);
	const [exportQuality, setExportQuality] = useState<ExportQuality>(preferences.exportQuality);
	const [exportEncodingMode, setExportEncodingMode] = useState<ExportEncodingMode>(
		preferences.exportEncodingMode,
	);
	const [exportBackendPreference, setExportBackendPreference] = useState<ExportBackendPreference>(
		preferences.exportBackendPreference,
	);
	const [exportPipelineModel, setExportPipelineModel] = useState<ExportPipelineModel>(
		preferences.exportPipelineModel,
	);
	const [mp4FrameRate, setMp4FrameRate] = useState<ExportMp4FrameRate>(
		preferences.mp4FrameRate ?? DEFAULT_MP4_EXPORT_FRAME_RATE,
	);
	const [exportFormat, setExportFormat] = useState<ExportFormat>(preferences.exportFormat);
	const [gifFrameRate, setGifFrameRate] = useState<GifFrameRate>(preferences.gifFrameRate);
	const [gifLoop, setGifLoop] = useState(preferences.gifLoop);
	const [gifSizePreset, setGifSizePreset] = useState<GifSizePreset>(preferences.gifSizePreset);
	// MrRecorder branded intro/outro cards
	const [brandedCardsEnabled, setBrandedCardsEnabled] = useState(
		preferences.brandedCardsEnabled ?? false,
	);
	const [brandCardTitle, setBrandCardTitle] = useState(preferences.brandCardTitle ?? "");
	const [brandCardSubtitle, setBrandCardSubtitle] = useState(
		preferences.brandCardSubtitle ?? "",
	);
	useEffect(() => {
		saveEditorPreferences({
			publishDestination,
			includeCaptionSidecar,
			exportQuality,
			exportEncodingMode,
			exportBackendPreference,
			exportPipelineModel,
			mp4FrameRate,
			exportFormat,
			gifFrameRate,
			gifLoop,
			gifSizePreset,
			brandedCardsEnabled,
			brandCardTitle,
			brandCardSubtitle,
		});
	}, [
		publishDestination,
		includeCaptionSidecar,
		exportQuality,
		exportEncodingMode,
		exportBackendPreference,
		exportPipelineModel,
		mp4FrameRate,
		exportFormat,
		gifFrameRate,
		gifLoop,
		gifSizePreset,
		brandedCardsEnabled,
		brandCardTitle,
		brandCardSubtitle,
	]);

	// MrRecorder: listen for one-click export preset requests (from toolbar)
	useEffect(() => {
		const handler = (e: Event) => {
			const preset = (e as CustomEvent<ExportPreset>).detail;
			if (!preset) return;
			setExportFormat(preset.format);
			setExportQuality(preset.quality);
			setMp4FrameRate(preset.frameRate);
		};
		window.addEventListener("mrrecorder:apply-export-preset", handler);
		return () => window.removeEventListener("mrrecorder:apply-export-preset", handler);
	}, []);

	const captionSidecarCues = useMemo(
		() =>
			projectCaptionCues(autoCaptions, clips)
				.filter(
					(cue) =>
						Number.isFinite(cue.startMs) &&
						Number.isFinite(cue.endMs) &&
						cue.endMs > cue.startMs &&
						typeof cue.text === "string" &&
						cue.text.trim().length > 0,
				)
				.map(({ startMs, endMs, text }) => ({ startMs, endMs, text })),
		[autoCaptions, clips],
	);

	return {
		publishDestination,
		setPublishDestination,
		includeCaptionSidecar,
		setIncludeCaptionSidecar,
		exportQuality,
		setExportQuality,
		exportEncodingMode,
		setExportEncodingMode,
		exportBackendPreference,
		setExportBackendPreference,
		exportPipelineModel,
		setExportPipelineModel,
		mp4FrameRate,
		setMp4FrameRate,
		exportFormat,
		setExportFormat,
		gifFrameRate,
		setGifFrameRate,
		gifLoop,
		setGifLoop,
		gifSizePreset,
		setGifSizePreset,
		brandedCardsEnabled,
		setBrandedCardsEnabled,
		brandCardTitle,
		setBrandCardTitle,
		brandCardSubtitle,
		setBrandCardSubtitle,
		captionSidecarCues,
	};
}

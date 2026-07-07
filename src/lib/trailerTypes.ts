export const TRAILER_TYPE_VALUES = ["flatbed"] as const;

export type TrailerType = (typeof TRAILER_TYPE_VALUES)[number];

export const TRAILER_TYPE_OPTIONS = [
	{ value: "flatbed", label: "Flatbed" },
] as const satisfies ReadonlyArray<{ value: TrailerType; label: string }>;

const TRAILER_TYPE_LABELS = new Map(
	TRAILER_TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

export function normalizeTrailerType(value: unknown): TrailerType | null {
	if (typeof value !== "string") return null;
	const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");

	if (normalized === "flatbed") return "flatbed";
	return null;
}

export function getTrailerTypeFormValue(value: unknown): TrailerType | "" {
	return normalizeTrailerType(value) ?? "";
}

export function formatTrailerType(value: unknown, fallback = "Trailer") {
	const normalized = normalizeTrailerType(value);
	if (normalized) return TRAILER_TYPE_LABELS.get(normalized) ?? fallback;

	if (typeof value === "string" && value.trim()) return value.trim();
	return fallback;
}

export function buildRentalTrailerTypeSummary(rental: {
	assignments?: Array<{
		trailer?: { trailerType?: unknown; trailer_type?: unknown } | null;
	}>;
	requestedTrailerTypes?: Array<{
		trailerType?: unknown;
		trailer_type?: unknown;
		quantity?: unknown;
	}>;
	requested_trailer_types?: Array<{
		trailerType?: unknown;
		trailer_type?: unknown;
		quantity?: unknown;
	}>;
	requestedTrailerType?: unknown;
	requestedTrailerCount?: unknown;
	requested_trailer_type?: unknown;
	requested_trailer_count?: unknown;
}) {
	const counts = new Map<string, number>();

	for (const assignment of rental.assignments ?? []) {
		const label = formatTrailerType(
			assignment?.trailer?.trailerType ?? assignment?.trailer?.trailer_type,
			"",
		);
		if (!label) continue;
		counts.set(label, (counts.get(label) ?? 0) + 1);
	}

	if (!counts.size) {
		for (const requested of [
			...(rental.requestedTrailerTypes ?? []),
			...(rental.requested_trailer_types ?? []),
		]) {
			const requestedLabel = formatTrailerType(
				requested?.trailerType ?? requested?.trailer_type,
				"",
			);
			const requestedCount = Number(requested?.quantity);
			if (!requestedLabel) continue;
			counts.set(
				requestedLabel,
				(counts.get(requestedLabel) ?? 0) +
					(Number.isFinite(requestedCount) && requestedCount > 0
						? Math.floor(requestedCount)
						: 1),
			);
		}
	}

	if (!counts.size) {
		const requestedLabel = formatTrailerType(
			rental.requestedTrailerType ?? rental.requested_trailer_type,
			"",
		);
		const requestedCount = Number(
			rental.requestedTrailerCount ?? rental.requested_trailer_count,
		);
		if (requestedLabel) {
			counts.set(
				requestedLabel,
				Number.isFinite(requestedCount) && requestedCount > 0
					? Math.floor(requestedCount)
					: 1,
			);
		}
	}

	return [...counts.entries()].map(([label, count]) => ({ label, count }));
}

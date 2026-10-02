/**
 * Server-side upload validation. The browser-declared MIME type is never trusted:
 * the real type is detected from the file's leading bytes.
 */

export const UPLOAD_TYPES = {
	"application/pdf": "pdf",
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
} as const;

export type UploadContentType = keyof typeof UPLOAD_TYPES;

export type ValidatedUpload = {
	buffer: Buffer;
	contentType: UploadContentType;
	extension: (typeof UPLOAD_TYPES)[UploadContentType];
	/** Cleaned original name, for display only. Never used in storage paths. */
	fileName: string;
	size: number;
};

export class UploadValidationError extends Error {
	status = 400;
	constructor(message: string) {
		super(message);
		this.name = "UploadValidationError";
	}
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
	if (bytes.length < offset + signature.length) return false;
	return signature.every((byte, index) => bytes[offset + index] === byte);
}

export function detectUploadContentType(bytes: Uint8Array): UploadContentType | null {
	if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return "application/pdf"; // %PDF
	if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
	if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
		return "image/png";
	}
	if (
		startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && // RIFF
		startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8) // WEBP
	) {
		return "image/webp";
	}
	return null;
}

export function sanitizeFileName(name: string | null | undefined, fallback = "document") {
	const cleaned = String(name ?? "")
		.normalize("NFKC")
		.replace(/[\u0000-\u001f\u007f]/g, "")
		.replace(/[\\/]/g, "-")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 120);
	return cleaned || fallback;
}

export async function readValidatedUpload(
	file: File,
	options: { label: string; maxBytes: number }
): Promise<ValidatedUpload> {
	if (!file.size) {
		throw new UploadValidationError(`${options.label} is empty.`);
	}

	if (file.size > options.maxBytes) {
		const megabytes = Math.round(options.maxBytes / (1024 * 1024));
		throw new UploadValidationError(`${options.label} must be ${megabytes} MB or smaller.`);
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	const contentType = detectUploadContentType(buffer);

	if (!contentType) {
		throw new UploadValidationError(
			`${options.label} must be a PDF, JPG, PNG, or WebP file.`
		);
	}

	return {
		buffer,
		contentType,
		extension: UPLOAD_TYPES[contentType],
		fileName: sanitizeFileName(file.name),
		size: buffer.length,
	};
}

const HTML_ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

/** Escapes a value for safe interpolation into HTML text or a quoted attribute. */
export function escapeHtml(value: unknown) {
	if (value === null || value === undefined) return "";
	return String(value).replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

/** Escapes user-provided multi-line text and preserves its line breaks. */
export function escapeMultiline(value: unknown) {
	return escapeHtml(value).replace(/\r?\n/g, "<br />");
}

/** Strips CR/LF so user input can't inject additional email headers via the subject. */
export function sanitizeSubject(value: unknown) {
	return String(value ?? "")
		.replace(/[\r\n]+/g, " ")
		.trim()
		.slice(0, 200);
}

/** Only allows http(s) URLs into href attributes. */
export function safeUrl(value: unknown) {
	const url = String(value ?? "");
	return /^https?:\/\//i.test(url) ? escapeHtml(url) : "#";
}

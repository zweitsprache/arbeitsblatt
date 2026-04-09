function normalizeSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function normalizeClientSubdomain(value: string) {
  return normalizeSegment(value);
}

export function buildClientSubdomainCandidate(name: string) {
  return normalizeClientSubdomain(name) || "client";
}

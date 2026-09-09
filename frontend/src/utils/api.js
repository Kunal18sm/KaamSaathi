// Only a public API origin belongs in VITE_API_URL. Never place credentials,
// JWT secrets, database URIs, or Cloudinary secrets in a Vite environment file.
const configuredOrigin = import.meta.env.VITE_API_URL || '';

export const API_ORIGIN = configuredOrigin.replace(/\/$/, '');

export function apiFetch(path, options) {
  const url = path.startsWith('http') ? path : `${API_ORIGIN}${path}`;
  return fetch(url, options);
}

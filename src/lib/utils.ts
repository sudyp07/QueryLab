import type { Cell } from '../types';
export const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const titleCase = (text: string) => text.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
export const formatMs = (ms: number) => ms < 1 ? `${ms.toFixed(2)} ms` : `${ms.toFixed(1)} ms`;
export const timeAgo = (time: number) => { const gap = Math.max(0, Date.now() - time); if (gap < 60000) return 'Just now'; if (gap < 3600000) return `${Math.floor(gap / 60000)}m ago`; if (gap < 86400000) return `${Math.floor(gap / 3600000)}h ago`; return new Date(time).toLocaleDateString(); };
export const friendlyError = (err: unknown) => err instanceof Error ? err.message : String(err);
export function downloadFile(name: string, content: BlobPart, mime: string) { const url = URL.createObjectURL(new Blob([content], { type: mime })); const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 3000); }
export const fileSafe = (name: string) => name.replace(/[^a-z0-9_-]/gi, '_').replace(/^_+/, '').slice(0, 70) || 'export';
export const quoteId = (id: string) => `"${id.replace(/"/g, '""')}"`;
export const sqlValue = (v: unknown) => v instanceof Uint8Array ? `X'${Array.from(v,b=>b.toString(16).padStart(2,'0')).join('')}'` : v === null || v === undefined ? 'NULL' : typeof v === 'number' && Number.isFinite(v) ? String(v) : typeof v === 'boolean' ? (v ? '1' : '0') : `'${String(v).replace(/'/g, "''")}'`;
export const showCell = (cell: Cell | unknown): string => cell === null || cell === undefined ? 'NULL' : cell instanceof Uint8Array ? `[BLOB: ${cell.byteLength} bytes]` : typeof cell === 'object' ? JSON.stringify(cell) : String(cell);
export const escapeCSV = (value: unknown) => { const s = value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function toCSV(columns: string[], rows: unknown[][]) { return [columns.map(escapeCSV).join(','), ...rows.map(row => row.map(escapeCSV).join(','))].join('\r\n'); }
export function toBase64(bytes: Uint8Array) { let s = ''; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(s); }
export function fromBase64(s: string) { const raw = atob(s); return Uint8Array.from(raw, c => c.charCodeAt(0)); }
export function normalizeResult(value: unknown): string { if (Array.isArray(value)) return `[${value.map(normalizeResult).sort().join(',')}]`; if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${normalizeResult(v)}`).join(',')}}`; return JSON.stringify(value); }

import path from 'node:path';

/**
 * Normalize a logical path (e.g. /main.js, foo/../bar).
 * Resolves . and .. and returns a path relative to workspace root.
 * Returns null if the path escapes the root (e.g. /foo/../../etc).
 * @param {string} logicalPath - Path like "/main.js" or "src/foo.js"
 * @returns {string | null} Normalized path with leading slash, or null if invalid
 */
export function normalizePath(logicalPath) {
  if (typeof logicalPath !== 'string' || logicalPath.length === 0) {
    return null;
  }
  // Use posix for consistent / separators (logical paths are always /)
  const segments = path.posix.normalize(logicalPath).split('/').filter(Boolean);
  const resolved = [];
  for (const seg of segments) {
    if (seg === '.') continue;
    if (seg === '..') {
      if (resolved.length === 0) return null; // escaping root
      resolved.pop();
    } else {
      resolved.push(seg);
    }
  }
  return '/' + resolved.join('/');
}

/**
 * Check if a logical path is allowed (stays within workspace root).
 * @param {string} logicalPath - Path to check (will be normalized)
 * @returns {boolean} true if path is valid and within root
 */
export function isPathAllowed(logicalPath) {
  const normalized = normalizePath(logicalPath);
  return normalized !== null;
}

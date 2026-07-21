import multer from "multer";

/**
 * Parses file size from string like "1 mb", "500 kb", "2 gb" to bytes.
 * Requires a space between the digit and the unit.
 */
export function parseFileSize(sizeStr: string): number {
  if (!sizeStr) return 10485760; // default 10MB
  
  const trimmed = sizeStr.trim();
  
  // Backward compatibility: if it is just a plain number
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  // Expect digit followed by space, then unit
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s+([a-zA-Z]+)$/);
  if (!match) {
    console.warn(`[Config] Invalid MAX_FILE_SIZE format: "${sizeStr}". Format must be "digit unit" with a space. Falling back to 10MB.`);
    return 10485760; // Fallback
  }

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "b":
    case "bytes":
      return Math.round(value);
    case "kb":
    case "kilobyte":
    case "kilobytes":
      return Math.round(value * 1024);
    case "mb":
    case "megabyte":
    case "megabytes":
      return Math.round(value * 1024 * 1024);
    case "gb":
    case "gigabyte":
    case "gigabytes":
      return Math.round(value * 1024 * 1024 * 1024);
    default:
      console.warn(`[Config] Unsupported unit: "${unit}" in MAX_FILE_SIZE config. Falling back to 10MB.`);
      return 10485760;
  }
}

export const maxFileSize = parseFileSize(process.env.MAX_FILE_SIZE || "10 mb");

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSize,
  },
});

// Helper to format bytes to human readable format
export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

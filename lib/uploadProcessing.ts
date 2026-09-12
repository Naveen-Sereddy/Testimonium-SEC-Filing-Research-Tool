import { extractPages } from './pdf';
import { isLikelyAnnualReport, processUploads, type UploadInput, type UploadProgress, type UploadResult } from './rag';

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_UPLOAD_FILES = 2;

export class UploadError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

export interface UploadedFileInput {
  fileName: string;
  type: string;
  size: number;
  buffer: Buffer;
}

/** Validate raw file data once, no matter whether it arrived in one request or in safe-sized parts. */
export async function processUploadedFiles(files: UploadedFileInput[], onProgress?: (progress: UploadProgress) => void): Promise<UploadResult> {
  if (files.length === 0) throw new UploadError('No file provided');
  if (files.length > MAX_UPLOAD_FILES) throw new UploadError('Compare up to two annual filings at a time');
  if (files.some((file) => file.type !== 'application/pdf')) throw new UploadError('This prototype currently supports SEC 10-K annual reports as PDF files. Please upload a supported filing.');
  if (files.reduce((total, file) => total + file.size, 0) > MAX_UPLOAD_BYTES) throw new UploadError('Combined upload exceeds the 50MB limit. Choose smaller files or remove one filing.');

  const inputs: UploadInput[] = [];
  for (const [index, file] of files.entries()) {
    onProgress?.({ stage: 'Extracting text', completed: index, total: files.length });
    if (file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') throw new UploadError(`${file.fileName} is not a valid PDF file`, 422);
    const pages = await extractPages(file.buffer);
    if (!isLikelyAnnualReport(pages)) throw new UploadError(`${file.fileName} does not appear to be a Form 10-K annual report`, 422);
    inputs.push({ buffer: file.buffer, fileName: file.fileName, pages });
  }
  return processUploads(inputs, { onProgress });
}

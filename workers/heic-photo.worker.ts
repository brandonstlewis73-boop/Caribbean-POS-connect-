import { heicTo } from 'heic-to/next';

// One worker per conversion; the caller terminates it to release decoder memory.
self.onmessage = async (event: MessageEvent<{file: File}>) => {
  try {
    const blob = await heicTo({blob: event.data.file, type: 'image/jpeg', quality: 0.9});
    self.postMessage({blob});
  } catch {
    self.postMessage({error: 'This HEIC photo could not be converted. It may be damaged or unsupported. Choose another photo.'});
  }
};

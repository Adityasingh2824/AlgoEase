declare global {
  interface Window {
    Buffer?: import("buffer").BufferConstructor;
    process?: { env?: Record<string, string> };
  }
}

export async function installBrowserPolyfills() {
  if (typeof window === "undefined") return;
  const { Buffer } = await import("buffer");
  if (!window.Buffer) {
    window.Buffer = Buffer;
  }
  if (!window.process) {
    window.process = { env: {} };
  } else if (!window.process.env) {
    window.process.env = {};
  }
}

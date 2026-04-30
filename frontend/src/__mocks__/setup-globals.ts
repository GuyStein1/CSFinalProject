// Override expo's lazy globals that jest-expo installs via expo/src/winter/runtime.native.ts.
// Those getters load native modules which throw "import outside scope" in Jest.
// We replace each one with a plain value that satisfies the expected interface.

Object.defineProperty(global, '__ExpoImportMetaRegistry', {
  value: { get url() { return ''; } },
  configurable: true,
  writable: true,
});

// structuredClone is installed as a lazy getter by expo's winter runtime.
// Node 17+ ships a native structuredClone; just point the global at it.
if (typeof (global as Record<string, unknown>).structuredClone !== 'function') {
  (global as Record<string, unknown>).structuredClone = <T>(obj: T): T =>
    JSON.parse(JSON.stringify(obj)) as T;
}

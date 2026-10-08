// Native storage is owned by the single running app process.
export async function acquireEditLease(): Promise<() => void> {
  return () => undefined;
}

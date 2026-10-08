// Hold an exclusive browser lock while a vault is unlocked. Two tabs must never
// replace one another's journal with different whole-document snapshots.
export function acquireEditLease(): Promise<() => void> {
  if (!navigator.locks)
    return Promise.reject(
      new Error('Use a current browser on HTTPS or localhost to open your journal safely.'),
    );
  return new Promise((resolve, reject) => {
    navigator.locks
      .request('cycle-tracker-vault-editor', { ifAvailable: true }, async (lock) => {
        if (!lock) {
          reject(
            new Error('Your journal is open in another tab. Lock it there before opening it here.'),
          );
          return;
        }
        await new Promise<void>((release) => resolve(release));
      })
      .catch(reject);
  });
}

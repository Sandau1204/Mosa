// Guild/channel IDs are optional: Activities can also start in DMs.
export function isDiscordActivity({ search, hostname, embedded, hasOpener = false }) {
  const params = new URLSearchParams(search);
  const launchParams = Boolean(params.get('frame_id') && params.get('instance_id'));
  const discordProxy = hostname.endsWith('.discordsays.com');
  return launchParams && (embedded || hasOpener || discordProxy);
}

export async function waitForDiscordReady(sdk, timeoutMs = 15000) {
  let timer;
  try {
    await Promise.race([
      sdk.ready(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Discord connection timed out. Please reopen the Activity or try again.')), timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

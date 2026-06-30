export async function getWebsiteStatus(url, options = {}) {
  const {
    timeoutMs = 4000,
    fallbackLabel = '🟡 Pulse In Development',
    fallbackDetail = 'Pulse is currently in development.',
  } = options;

  if (!url) {
    return {
      isOnline: false,
      label: fallbackLabel,
      detail: fallbackDetail,
      checkedUrl: null,
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      return {
        isOnline: true,
        label: '🟢 Online',
        detail: `Website is responding successfully with status ${response.status}.`,
        checkedUrl: url,
      };
    }

    return {
      isOnline: false,
      label: '🟡 Pulse In Development',
      detail: `Website is responding with status ${response.status}.`,
      checkedUrl: url,
    };
  } catch {
    return {
      isOnline: false,
      label: fallbackLabel,
      detail: fallbackDetail,
      checkedUrl: url,
    };
  }
}

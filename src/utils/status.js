export async function getWebsiteStatus(url, options = {}) {
  const {
    timeoutMs = 4000,
    fallbackLabel = '🟡 Pulse In Development',
    fallbackDetail = 'Pulse befindet sich aktuell in Entwicklung.',
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
        detail: `Die Website antwortet erfolgreich mit Status ${response.status}.`,
        checkedUrl: url,
      };
    }

    return {
      isOnline: false,
      label: '🟡 Pulse In Development',
      detail: `Die Website antwortet mit Status ${response.status}.`,
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

export function isWindowObjectExist(): boolean {
  return typeof window !== 'undefined';
}

export function loadScript(
  scriptUrl: string,
  onSuccess: () => void,
  onError?: (message?: string, exception?: any) => void,
  scriptId?: string,
) {
  if (!isWindowObjectExist()) {
    return;
  }
  const head = document.getElementsByTagName('head')[0];
  const script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('src', scriptUrl);
  if (scriptId) {
    script.id = scriptId;
  }

  script.onload = () => {
    if (onSuccess) {
      onSuccess();
    }
  };

  script.onerror = (e) => {
    if (onError) {
      onError(`Unable to load script '${scriptUrl}'`, e);
    }
  };

  head.appendChild(script);
}

export function loadScriptAsync(
  scriptUrl: string,
  scriptId?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    loadScript(
      scriptUrl,
      () => {
        resolve();
      },
      (message, exception) => {
        reject(exception);
      },
    );
  });
}

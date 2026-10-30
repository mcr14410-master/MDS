// frontend/src/utils/clipboard.js
// Text in die Zwischenablage. navigator.clipboard gibt es nur in sicheren Kontexten (HTTPS, localhost) –
// das MDS läuft im LAN über HTTP, daher Rückfall auf ein verstecktes Textfeld + execCommand.
export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Rückfall unten
    }
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(area);
  return ok;
}

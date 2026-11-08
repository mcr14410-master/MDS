/**
 * Dateien aus Drag & Drop lesen (FileSystemEntry, auch Ordner rekursiv)
 * Liefert [{ file, path }] mit Pfad relativ zur Auswahl ('/' als Trenner), damit Unterordner erkennbar bleiben.
 * Genutzt vom Messprogramm-Upload und vom Altbestand-Import.
 */
export async function filesFromEntry(entry) {
  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
    return [{ file, path: entry.fullPath.replace(/^\//, '') }];
  }
  if (entry.isDirectory) {
    const reader = entry.createReader();
    const entries = [];
    // readEntries liefert in Blöcken, bis ein leerer Block kommt
    for (;;) {
      const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
      if (batch.length === 0) break;
      entries.push(...batch);
    }
    const nested = await Promise.all(entries.map(filesFromEntry));
    return nested.flat();
  }
  return [];
}

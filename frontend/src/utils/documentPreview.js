// Welche Vorschau passt zu einem Dokument? 'image' | 'pdf' | 'model' | null (nur Download)
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
// online-3d-viewer (StepViewer); Parasolid (.x_t, .x_b) und ACIS (.sat) kann er nicht
const MODEL_EXT = ['step', 'stp', 'stl', 'obj', 'iges', 'igs', '3ds', 'gltf', 'glb'];

export function previewKind(fileName = '', mimeType = '') {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if ((mimeType || '').startsWith('image/') && ext !== 'tif' && ext !== 'tiff') return 'image';
  if (IMAGE_EXT.includes(ext)) return 'image';
  if (ext === 'pdf' || mimeType === 'application/pdf') return 'pdf';
  if (MODEL_EXT.includes(ext)) return 'model';
  return null;
}

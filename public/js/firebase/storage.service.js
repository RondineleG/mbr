/* ═══════════════════════════════════════════════════════════════
   STORAGE SERVICE — upload de imagens (produtos)
   Real: Firebase Storage. Demo: converte para data URL (base64).
   ═══════════════════════════════════════════════════════════════ */
import { IS_DEMO } from "../../firebase-config.js";

/** Lê um File como data URL (usado no modo demo e como preview). */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Faz upload de uma imagem e retorna a URL para gravar em products.image.
 * @param {File} file
 * @param {string} path  caminho lógico, ex.: `products/${id}.jpg`
 */
export async function uploadImage(file, path) {
  if (IS_DEMO) return fileToDataUrl(file);

  const { getFirebase } = await import("../../firebase-config.js");
  const { storage } = await getFirebase();
  const { ref, uploadBytes, getDownloadURL } = await import(
    "https://www.gstatic.com/firebasejs/12.13.0/firebase-storage.js"
  );
  const r = ref(storage, path);
  await uploadBytes(r, file);
  return getDownloadURL(r);
}

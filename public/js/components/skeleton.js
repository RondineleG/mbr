/* ═══════════════════════════════════════════════════════════════
   SKELETON — placeholders de carregamento (shimmer)
   ═══════════════════════════════════════════════════════════════ */

/** N linhas de skeleton estilo "menu item". */
export function skeletonList(n = 4) {
  return Array.from({ length: n }, () => `
    <div class="skeleton-item">
      <div class="skeleton-box sk-icon"></div>
      <div class="skeleton-lines">
        <div class="skeleton-box sk-line"></div>
        <div class="skeleton-box sk-line short"></div>
      </div>
    </div>`).join("");
}

/** N cards horizontais (recompensas). */
export function skeletonCards(n = 3) {
  return Array.from({ length: n }, () => `<div class="skeleton-box sk-card"></div>`).join("");
}

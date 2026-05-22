/* ═══════════════════════════════════════════════════════════════
   LOADING UTILS — skeleton loading, empty states, loading states
   ═══════════════════════════════════════════════════════════════ */

/**
 * Gera HTML para skeleton loading de lista
 */
export function skeletonList(count = 3) {
  return Array(count).fill(0).map(() => `
    <div class="skeleton-list-item">
      <div class="skeleton skeleton-avatar"></div>
      <div class="skeleton-content">
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text-sm"></div>
      </div>
    </div>
  `).join("");
}

/**
 * Gera HTML para skeleton loading de cards
 */
export function skeletonCards(count = 3) {
  return Array(count).fill(0).map(() => `
    <div class="skeleton skeleton-card"></div>
  `).join("");
}

/**
 * Gera HTML para skeleton loading de texto
 */
export function skeletonText(lines = 3) {
  return Array(lines).fill(0).map(() => `
    <div class="skeleton skeleton-text"></div>
  `).join("");
}

/**
 * Gera HTML para empty state
 */
export function emptyState(icon, title, description, action = null) {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <div class="empty-title">${title}</div>
      <div class="empty-desc">${description}</div>
      ${action ? `<div class="empty-action">${action}</div>` : ""}
    </div>
  `;
}

/**
 * Gera HTML para loading state
 */
export function loadingState(text = "Carregando...") {
  return `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <div class="loading-text">${text}</div>
    </div>
  `;
}

/**
 * Wrapper para conteúdo com loading state
 */
export function withLoading(content, isLoading, loadingText = "Carregando...") {
  if (isLoading) {
    return loadingState(loadingText);
  }
  return content;
}

/**
 * Wrapper para conteúdo com empty state
 */
export function withEmpty(content, isEmpty, emptyConfig) {
  if (isEmpty) {
    return emptyState(
      emptyConfig.icon || "📭",
      emptyConfig.title || "Nada encontrado",
      emptyConfig.description || "Não há itens para exibir",
      emptyConfig.action || null
    );
  }
  return content;
}

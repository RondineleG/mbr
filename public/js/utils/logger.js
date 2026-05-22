/* ═══════════════════════════════════════════════════════════════
   LOGGER — Sistema de logging estruturado
   Níveis: DEBUG, INFO, WARN, ERROR
   ═══════════════════════════════════════════════════════════════ */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

let currentLevel = LOG_LEVELS.INFO;
let logs = [];
const MAX_LOGS = 100;

// Configura nível de log baseado em ambiente
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  currentLevel = LOG_LEVELS.DEBUG;
} else {
  currentLevel = LOG_LEVELS.INFO;
}

/**
 * Formata timestamp para logging
 */
function formatTimestamp() {
  const now = new Date();
  return now.toISOString();
}

/**
 * Adiciona log ao buffer
 */
function addLog(level, category, message, data = null) {
  const logEntry = {
    timestamp: formatTimestamp(),
    level,
    category,
    message,
    data,
    url: window.location.href,
    userAgent: navigator.userAgent
  };
  
  // Adiciona ao buffer
  logs.push(logEntry);
  
  // Mantém apenas os últimos MAX_LOGS
  if (logs.length > MAX_LOGS) {
    logs = logs.slice(-MAX_LOGS);
  }
  
  // Em produção, enviar para serviço de logging
  if (level === LOG_LEVELS.ERROR && currentLevel >= LOG_LEVELS.INFO) {
    sendToLoggingService(logEntry);
  }
}

/**
 * Envia log para serviço de logging (placeholder)
 */
function sendToLoggingService(logEntry) {
  // Em produção, integrar com serviço como Sentry, LogRocket, etc.
  // Por enquanto, apenas console
  console.error('[Logging Service]', logEntry);
}

/**
 * Log level DEBUG
 */
export function debug(category, message, data = null) {
  if (currentLevel <= LOG_LEVELS.DEBUG) {
    console.debug(`[DEBUG] [${category}] ${message}`, data || '');
    addLog('DEBUG', category, message, data);
  }
}

/**
 * Log level INFO
 */
export function info(category, message, data = null) {
  if (currentLevel <= LOG_LEVELS.INFO) {
    console.info(`[INFO] [${category}] ${message}`, data || '');
    addLog('INFO', category, message, data);
  }
}

/**
 * Log level WARN
 */
export function warn(category, message, data = null) {
  if (currentLevel <= LOG_LEVELS.WARN) {
    console.warn(`[WARN] [${category}] ${message}`, data || '');
    addLog('WARN', category, message, data);
  }
}

/**
 * Log level ERROR
 */
export function error(category, message, error = null, data = null) {
  if (currentLevel <= LOG_LEVELS.ERROR) {
    console.error(`[ERROR] [${category}] ${message}`, error || '', data || '');
    addLog('ERROR', category, message, {
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : null,
      data
    });
  }
}

/**
 * Obtém logs do buffer
 */
export function getLogs(filter = null) {
  if (!filter) return logs;
  
  return logs.filter(log => {
    if (filter.level && log.level !== filter.level) return false;
    if (filter.category && log.category !== filter.category) return false;
    return true;
  });
}

/**
 * Limpa buffer de logs
 */
export function clearLogs() {
  logs = [];
}

/**
 * Configura nível de log
 */
export function setLogLevel(level) {
  if (LOG_LEVELS[level] !== undefined) {
    currentLevel = LOG_LEVELS[level];
    info('LOGGER', `Log level set to ${level}`);
  }
}

/**
 * Exporta logs para download
 */
export function exportLogs() {
  const logsStr = JSON.stringify(logs, null, 2);
  const blob = new Blob([logsStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `mrbur-logs-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Captura erros globais não tratados
 */
export function setupGlobalErrorHandling() {
  // Captura erros JavaScript
  window.addEventListener('error', (event) => {
    error('GLOBAL', 'Uncaught error', event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });
  
  // Captura rejeições de Promise não tratadas
  window.addEventListener('unhandledrejection', (event) => {
    error('GLOBAL', 'Unhandled promise rejection', event.reason);
  });
  
  info('LOGGER', 'Global error handling initialized');
}

// Inicializa error handling global
if (typeof window !== 'undefined') {
  setupGlobalErrorHandling();
}

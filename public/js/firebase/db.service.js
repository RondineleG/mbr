/* ═══════════════════════════════════════════════════════════════
   DB SERVICE — fachada única de acesso a dados
   Escolhe a implementação real (Firestore) ou demo (localStorage)
   conforme IS_DEMO. O resto do app só conhece ESTA interface.
   ═══════════════════════════════════════════════════════════════ */
import { IS_DEMO } from "../../firebase-config.js";
import { info, debug, warn, error } from "../utils/logger.js";

const impl = IS_DEMO
  ? await import("./firestore-demo.js")
  : await import("./firestore-real.js");

info('DB', `Using ${IS_DEMO ? 'DEMO' : 'REAL'} database implementation`);

// Wrapper functions with logging
export const getDoc = async (path) => {
  debug('DB', `getDoc: ${path}`);
  try {
    const result = await impl.getDoc(path);
    debug('DB', `getDoc success: ${path}`);
    return result;
  } catch (err) {
    error('DB', 'getDoc failed', err, { path });
    throw err;
  }
};

export const setDoc = async (path, data) => {
  debug('DB', `setDoc: ${path}`);
  try {
    const result = await impl.setDoc(path, data);
    info('DB', `setDoc success: ${path}`);
    return result;
  } catch (err) {
    error('DB', 'setDoc failed', err, { path });
    throw err;
  }
};

export const updateDoc = async (path, data) => {
  debug('DB', `updateDoc: ${path}`);
  try {
    const result = await impl.updateDoc(path, data);
    info('DB', `updateDoc success: ${path}`);
    return result;
  } catch (err) {
    error('DB', 'updateDoc failed', err, { path });
    throw err;
  }
};

export const addDoc = async (collection, data) => {
  debug('DB', `addDoc: ${collection}`);
  try {
    const result = await impl.addDoc(collection, data);
    info('DB', `addDoc success: ${collection}`);
    return result;
  } catch (err) {
    error('DB', 'addDoc failed', err, { collection });
    throw err;
  }
};

export const deleteDoc = async (path) => {
  debug('DB', `deleteDoc: ${path}`);
  try {
    const result = await impl.deleteDoc(path);
    info('DB', `deleteDoc success: ${path}`);
    return result;
  } catch (err) {
    error('DB', 'deleteDoc failed', err, { path });
    throw err;
  }
};

export const getCollection = async (collection, options = {}) => {
  debug('DB', `getCollection: ${collection}`, options);
  try {
    const result = await impl.getCollection(collection, options);
    debug('DB', `getCollection success: ${collection} (${result.length} items)`);
    return result;
  } catch (err) {
    error('DB', 'getCollection failed', err, { collection, options });
    throw err;
  }
};

export const watchDoc = (path, callback) => {
  debug('DB', `watchDoc: ${path}`);
  return impl.watchDoc(path, (data) => {
    debug('DB', `watchDoc update: ${path}`);
    callback(data);
  });
};

export const watchCollection = (collection, options = {}, callback) => {
  debug('DB', `watchCollection: ${collection}`, options);
  // Handle both old and new parameter orders for compatibility
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  return impl.watchCollection(collection, options, (data) => {
    debug('DB', `watchCollection update: ${collection} (${data.length} items)`);
    callback(data);
  });
};

export const runTransaction = async (callback) => {
  debug('DB', 'runTransaction start');
  try {
    const result = await impl.runTransaction(callback);
    info('DB', 'runTransaction success');
    return result;
  } catch (err) {
    error('DB', 'runTransaction failed', err);
    throw err;
  }
};

/** Sentinela de incremento atômico (use em updateDoc/setDoc-merge). */
export const inc = impl.increment;
/** Timestamp do servidor (ms no demo, Timestamp no real). */
export const tsNow = impl.serverTimestamp;

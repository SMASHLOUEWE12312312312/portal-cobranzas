/**
 * @fileoverview Operaciones de Google Drive con retry logic
 */

const DriveIO = {
  /**
   * Obtiene carpeta de salida con estructura de fechas
   * MODIFICADO: Ahora crea estructura Cobranzas_Transperuana/EECC Asegurados/YYYY/MM/DD
   * @param {string} aseguradoName - Nombre del asegurado (opcional)
   * @return {GoogleAppsScript.Drive.Folder} Carpeta destino
   */
  getOutputFolder(aseguradoName = null) {
    const context = 'DriveIO.getOutputFolder';
    const cobranzasFolderId = getConfig('DRIVE.OUTPUT_FOLDER_ID');

    if (!cobranzasFolderId) {
      throw new Error('OUTPUT_FOLDER_ID no configurado');
    }

    // Obtener carpeta base Cobranzas_Transperuana
    const cobranzasFolder = Utils.retryWithBackoff(() => DriveApp.getFolderById(cobranzasFolderId));

    // Crear o obtener carpeta "EECC Asegurados"
    const eeccAseguradosFolder = this._getOrCreateFolder(cobranzasFolder, 'EECC Asegurados');

    if (!getConfig('DRIVE.USE_DATE_SUBFOLDERS', true)) {
      if (aseguradoName && getConfig('DRIVE.SUBFOLDER_BY_ASEGURADO', false)) {
        return this._getOrCreateFolder(eeccAseguradosFolder, Utils.safeName(aseguradoName).substring(0, 120));
      }
      return eeccAseguradosFolder;
    }

    // Estructura: YYYY/MM/DD
    const now = new Date();
    const tz = getConfig('FORMAT.TIMEZONE', 'America/Lima');

    const year = Utilities.formatDate(now, tz, 'yyyy');
    const month = Utilities.formatDate(now, tz, 'MM');
    const day = Utilities.formatDate(now, tz, 'dd');

    const yearFolder = this._getOrCreateFolder(eeccAseguradosFolder, year);
    const monthFolder = this._getOrCreateFolder(yearFolder, month);
    const dayFolder = this._getOrCreateFolder(monthFolder, day);

    if (aseguradoName && getConfig('DRIVE.SUBFOLDER_BY_ASEGURADO', false)) {
      return this._getOrCreateFolder(dayFolder, Utils.safeName(aseguradoName).substring(0, 120));
    }

    return dayFolder;
  },

  /**
   * Obtiene o crea subcarpeta
   * @private
   */
  _getOrCreateFolder(parent, name) {
    const it = parent.getFoldersByName(name);
    if (it.hasNext()) {
      return it.next();
    }
    return parent.createFolder(name);
  },

  /**
   * Obtiene path completo de una carpeta
   * @param {GoogleAppsScript.Drive.Folder} folder - Carpeta
   * @param {number} maxDepth - Profundidad máxima (default: 10)
   * @return {string} Path completo
   */
  getFolderPath(folder, maxDepth = 10) {
    const names = [folder.getName()];
    let current = folder;

    for (let i = 0; i < maxDepth; i++) {
      const parents = current.getParents();
      if (!parents.hasNext()) break;

      const p = parents.next();
      names.push(p.getName());

      // Detener si llegamos a la carpeta de salida configurada
      if (p.getId() === getConfig('DRIVE.OUTPUT_FOLDER_ID')) break;

      current = p;
    }

    return names.reverse().join('/');
  },

  /**
   * Sube archivo temporal y lo convierte (CSV → mantenido, XLSX → Google Sheet)
   * @param {GoogleAppsScript.Base.Blob} blob - Archivo
   * @param {boolean} convertToSheets - Convertir a Google Sheets (para XLSX)
   * @return {Object} { fileId: string, mimeType: string }
   */
  uploadTempFile(blob, convertToSheets = false) {
    const context = 'DriveIO.uploadTempFile';
    Logger.debug(context, 'Uploading temp file', {
      name: blob.getName(),
      size: blob.getBytes().length,
      convert: convertToSheets
    });

    try {
      if (convertToSheets) {
        const resource = {
          title: 'TMP_' + Date.now(),
          mimeType: 'application/vnd.google-apps.spreadsheet'
        };

        const file = Utils.retryWithBackoff(() =>
          Drive.Files.insert(resource, blob, { convert: true })
        );

        return { fileId: file.id, mimeType: file.mimeType };
      } else {
        const file = Utils.retryWithBackoff(() => DriveApp.createFile(blob));
        return { fileId: file.getId(), mimeType: file.getMimeType() };
      }
    } catch (error) {
      Logger.error(context, 'Upload failed', error);
      throw error;
    }
  },

  /**
   * Elimina archivo con retry
   * @param {string} fileId - ID del archivo
   */
  deleteFile(fileId) {
    if (!fileId) return;

    try {
      Utils.retryWithBackoff(() => {
        Drive.Files.remove(fileId);
      }, 2, 500); // 2 retries, delay corto
    } catch (error) {
      Logger.warn('DriveIO.deleteFile', 'Delete failed (non-critical)', { fileId, error: error.message });
    }
  },

  /**
   * Obtiene logo como blob (con caché - Phase 0)
   * 
   * v1.1 Phase 0:
   * - Cachea logo en CacheService como base64
   * - Size guard: no cachea si > 80KB
   * - Graceful degradation: si falla cache, lee directo de Drive
   * 
   * @return {GoogleAppsScript.Base.Blob|null} Blob del logo o null
   */
  getLogoCached() {
    const context = 'DriveIO.getLogoCached';
    const logoId = getConfig('DRIVE.LOGO_FILE_ID');
    if (!logoId) return null;

    // Check if caching is enabled
    const cacheEnabled = getConfig('FEATURES.ENABLE_LOGO_CACHE', true);

    if (cacheEnabled) {
      try {
        const cache = CacheService.getScriptCache();
        const cacheKey = 'EECC_LOGO_BLOB::' + logoId;

        // Try to get from cache
        const cached = cache.get(cacheKey);
        if (cached) {
          try {
            // Decode base64 cached blob
            const bytes = Utilities.base64Decode(cached);
            const blob = Utilities.newBlob(bytes, 'image/png', 'logo.png');
            Logger.debug(context, 'Logo served from cache');
            return blob;
          } catch (decodeError) {
            // Cache corrupted, fall through to fetch fresh
            Logger.warn(context, 'Failed to decode cached logo, fetching fresh', decodeError);
          }
        }

        // Fetch from Drive
        const file = DriveApp.getFileById(logoId);
        const blob = file.getBlob();

        // Cache the blob as base64 (with size guard)
        try {
          const bytes = blob.getBytes();
          const sizeBytes = bytes.length;
          const MAX_CACHE_SIZE = 80000; // 80KB - conservative limit for CacheService

          if (sizeBytes <= MAX_CACHE_SIZE) {
            const base64 = Utilities.base64Encode(bytes);
            const ttl = getConfig('FEATURES.LOGO_CACHE_TTL_SECONDS', 3600);
            cache.put(cacheKey, base64, ttl);
            Logger.debug(context, 'Logo cached', { sizeBytes, ttl });
          } else {
            Logger.warn(context, 'Logo too large to cache, serving directly', { sizeBytes, maxSize: MAX_CACHE_SIZE });
          }
        } catch (cacheError) {
          // Non-critical: continue with uncached blob
          Logger.warn(context, 'Failed to cache logo (continuing without cache)', cacheError);
        }

        return blob;

      } catch (error) {
        // Graceful degradation: try direct read if caching logic fails
        Logger.warn(context, 'Cache logic failed, trying direct read', error);
      }
    }

    // Direct read (cache disabled or cache logic failed)
    try {
      const file = DriveApp.getFileById(logoId);
      const blob = file.getBlob();
      Logger.debug(context, 'Logo loaded from Drive (no cache)');
      return blob;
    } catch (error) {
      // Fail-safe: If logo fails, return null but don't break the process
      Logger.warn(context, 'Failed to load logo (continuing without logo)', { id: logoId, error: error.message });
      return null;
    }
  },

  /**
   * Crea un archivo ZIP con los archivos especificados
   * @param {Array<string>} fileUrls - URLs de los archivos a incluir
   * @param {string} zipName - Nombre del archivo ZIP
   * @return {string} URL de descarga del ZIP
   */
  createZip(fileUrls, zipName) {
    const context = 'DriveIO.createZip';
    try {
      const blobs = [];

      for (const url of fileUrls) {
        // Extraer ID de la URL
        const idMatch = url.match(/[-\w]{25,}/);
        if (idMatch) {
          try {
            const file = DriveApp.getFileById(idMatch[0]);
            blobs.push(file.getBlob());
          } catch (e) {
            Logger.warn(context, `Could not add file to ZIP: ${url}`, e);
          }
        }
      }

      if (blobs.length === 0) {
        throw new Error('No se encontraron archivos válidos para el ZIP');
      }

      const zipBlob = Utilities.zip(blobs, zipName);

      // Guardar ZIP en la carpeta del día
      const folder = this.getOutputFolder();
      const zipFile = folder.createFile(zipBlob);

      return zipFile.getUrl();

    } catch (error) {
      Logger.error(context, 'Error creating ZIP', error);
      throw error;
    }
  }
};

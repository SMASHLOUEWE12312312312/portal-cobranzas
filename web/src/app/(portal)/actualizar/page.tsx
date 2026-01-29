'use client';

import { useState, useRef } from 'react';

interface UploadResult {
    ok: boolean;
    filas?: number;
    mensaje?: string;
    duplicatesRemoved?: number;
    error?: { message: string };
}

/**
 * Actualizar Base Page
 * 
 * Upload Excel/CSV files to update BD sheet
 */
export default function ActualizarPage() {
    const [file, setFile] = useState<File | null>(null);
    const [hasHeader, setHasHeader] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<UploadResult | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    function addLog(message: string) {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setResult(null);
            setLogs([]);
            addLog(`Archivo seleccionado: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`);
        }
    }

    async function handleUpload() {
        if (!file) return;

        setUploading(true);
        setResult(null);
        addLog('Iniciando carga...');

        try {
            // Read file as base64
            addLog('Leyendo archivo...');
            const base64 = await readFileAsBase64(file);
            addLog('Archivo leído correctamente');

            // Upload to API
            addLog('Enviando al servidor...');
            const response = await fetch('/api/base/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dataBase64: base64,
                    name: file.name,
                    mimeType: file.type,
                    tieneEncabezado: hasHeader,
                }),
            });

            const data = await response.json();
            setResult(data);

            if (data.ok) {
                addLog(`✅ Carga exitosa: ${data.data?.filas || 0} filas procesadas`);
                if (data.data?.duplicatesRemoved) {
                    addLog(`📋 ${data.data.duplicatesRemoved} duplicados eliminados`);
                }
            } else {
                addLog(`❌ Error: ${data.error?.message || 'Error desconocido'}`);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error de conexión';
            addLog(`❌ Error: ${message}`);
            setResult({ ok: false, error: { message } });
        } finally {
            setUploading(false);
        }
    }

    function readFileAsBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                // Remove data:xxx;base64, prefix
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    📤 Actualizar Base de Datos
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Sube archivos Excel o CSV para actualizar la base de datos principal
                </p>
            </div>

            {/* Upload Card */}
            <div className="card max-w-2xl">
                {/* File Input */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Archivo Excel o CSV
                        </label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            Se deduplicará automáticamente por CUPÓN. Aceptamos .xlsx, .xls y .csv (máx. 37.5MB)
                        </p>
                    </div>

                    {/* Has Header Checkbox */}
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={hasHeader}
                            onChange={(e) => setHasHeader(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            El archivo tiene encabezados
                        </span>
                    </label>

                    {/* Upload Button */}
                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="btn btn-primary w-full"
                    >
                        {uploading ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                Procesando...
                            </>
                        ) : (
                            <>
                                📤 Subir y actualizar
                            </>
                        )}
                    </button>
                </div>

                {/* Result Message */}
                {result && (
                    <div className={`mt-4 p-4 rounded-lg ${
                        result.ok 
                            ? 'bg-green-50 border border-green-200 text-green-800'
                            : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                        <div className="flex items-start gap-3">
                            <span className="text-xl">{result.ok ? '✅' : '❌'}</span>
                            <div>
                                <p className="font-medium">
                                    {result.ok ? 'Carga exitosa' : 'Error en la carga'}
                                </p>
                                <p className="text-sm mt-1">
                                    {result.ok 
                                        ? result.mensaje || `${result.filas} filas procesadas`
                                        : result.error?.message
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Activity Log */}
                {logs.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            📋 Log de actividad
                        </h4>
                        <div className="bg-gray-900 rounded-lg p-4 max-h-60 overflow-y-auto font-mono text-xs text-gray-300 space-y-1">
                            {logs.map((log, i) => (
                                <div key={i}>{log}</div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

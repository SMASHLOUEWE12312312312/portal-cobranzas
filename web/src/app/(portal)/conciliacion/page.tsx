'use client';

import { useState, useEffect } from 'react';

interface ConciliacionStatus {
    loaded?: boolean;  // Legacy
    bdCruceStatus?: 'loaded' | 'empty';  // New
    rows?: number;
    rowCount?: number;  // New
    lastUpdated?: string;
    lastUpdate?: string;  // New
}

interface Insurer {
    key: string;
    name: string;
    enabled: boolean;
}

interface ProcessResult {
    ok: boolean;
    stats?: {
        totalRows: number;
        matched: number;
        unmatched: number;
    };
    exports?: {
        cruceUrl?: string;
        reportUrl?: string;
    };
    error?: string;
}

/**
 * Conciliación Page
 * 
 * Process EECC files from insurers against BD Sisnet
 */
export default function ConciliacionPage() {
    const [status, setStatus] = useState<ConciliacionStatus | null>(null);
    const [insurers, setInsurers] = useState<Insurer[]>([]);
    const [step, setStep] = useState(1);
    
    // Upload BD Sisnet
    const [bdFile, setBdFile] = useState<File | null>(null);
    const [uploadingBd, setUploadingBd] = useState(false);
    
    // Process Insurer
    const [selectedInsurer, setSelectedInsurer] = useState('');
    const [insurerFile, setInsurerFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<ProcessResult | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [statusRes, insurersRes] = await Promise.all([
                fetch('/api/conciliacion/status'),
                fetch('/api/conciliacion/insurers'),
            ]);

            if (statusRes.ok) {
                const data = await statusRes.json();
                if (data.ok) setStatus(data.data);
            }

            if (insurersRes.ok) {
                const data = await insurersRes.json();
                if (data.ok) setInsurers(data.data || []);
            }
        } catch (error) {
            console.error('Error loading conciliacion data:', error);
        }
    }

    async function handleUploadBDSisnet() {
        if (!bdFile) return;

        setUploadingBd(true);
        try {
            const base64 = await readFileAsBase64(bdFile);
            
            const res = await fetch('/api/conciliacion/upload-bd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    base64Data: base64,
                    fileName: bdFile.name,
                    mimeType: bdFile.type,
                }),
            });

            const data = await res.json();
            if (data.ok) {
                await loadData(); // Refresh status
                setBdFile(null);
            } else {
                alert(`Error: ${data.error?.message}`);
            }
        } catch (error) {
            alert('Error al cargar archivo');
        } finally {
            setUploadingBd(false);
        }
    }

    async function handleProcess() {
        if (!selectedInsurer || !insurerFile) return;

        setProcessing(true);
        setResult(null);

        try {
            const base64 = await readFileAsBase64(insurerFile);
            
            const res = await fetch('/api/conciliacion/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    insurerKey: selectedInsurer,
                    base64Data: base64,
                    fileName: insurerFile.name,
                    mimeType: insurerFile.type,
                }),
            });

            const data = await res.json();
            setResult(data);
            
            if (data.ok) {
                setStep(3);
            }
        } catch (error) {
            setResult({ ok: false, error: 'Error de conexión' });
        } finally {
            setProcessing(false);
        }
    }

    function readFileAsBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
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
                    🔄 Conciliación de Cobranzas
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Cruce de estados de cuenta de aseguradoras vs BD Sisnet
                </p>
            </div>

            {/* BD Cruce Status */}
            <div className="card">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    📊 Estado de BD Cruce
                    {(status?.loaded || status?.bdCruceStatus === 'loaded') && (
                        <span className="badge badge-success">Cargada</span>
                    )}
                </h3>
                
                {(status?.loaded || status?.bdCruceStatus === 'loaded') ? (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-green-50 rounded-lg">
                            <p className="text-2xl font-bold text-green-700">
                                {(status.rowCount || status.rows || 0).toLocaleString()}
                            </p>
                            <p className="text-sm text-green-600">Filas cargadas</p>
                        </div>
                        {(status.lastUpdated || status.lastUpdate) && (
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600">Última actualización</p>
                                <p className="font-medium">{status.lastUpdated || status.lastUpdate}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800">
                            ⚠️ BD Cruce no está cargada. Sube el archivo BD Sisnet primero.
                        </p>
                    </div>
                )}
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-4">
                {[
                    { num: 1, label: 'Cargar BD Sisnet' },
                    { num: 2, label: 'Procesar Aseguradora' },
                    { num: 3, label: 'Resultados' },
                ].map((s, i) => (
                    <button
                        key={s.num}
                        onClick={() => setStep(s.num)}
                        className="flex items-center gap-2"
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            step >= s.num 
                                ? 'bg-red-600 text-white' 
                                : 'bg-gray-200 text-gray-600'
                        }`}>
                            {s.num}
                        </div>
                        <span className={`text-sm ${step >= s.num ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                            {s.label}
                        </span>
                        {i < 2 && <div className="w-8 h-0.5 bg-gray-200" />}
                    </button>
                ))}
            </div>

            {/* Step 1: Upload BD Sisnet */}
            {step === 1 && (
                <div className="card">
                    <h3 className="font-semibold mb-4">Paso 1: Cargar BD Sisnet</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Sube el archivo de BD Sisnet (Excel) que servirá como base de cruce.
                    </p>

                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => setBdFile(e.target.files?.[0] || null)}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
                    />

                    {bdFile && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                            <span className="text-sm">{bdFile.name}</span>
                            <button
                                onClick={handleUploadBDSisnet}
                                disabled={uploadingBd}
                                className="btn btn-primary"
                            >
                                {uploadingBd ? '⏳ Subiendo...' : '📤 Cargar BD'}
                            </button>
                        </div>
                    )}

                    {status?.loaded && (
                        <button
                            onClick={() => setStep(2)}
                            className="btn btn-primary w-full mt-6"
                        >
                            Continuar → Procesar Aseguradora
                        </button>
                    )}
                </div>
            )}

            {/* Step 2: Process Insurer */}
            {step === 2 && (
                <div className="card">
                    <h3 className="font-semibold mb-4">Paso 2: Procesar Aseguradora</h3>
                    
                    {!status?.loaded && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                            <p className="text-yellow-800">
                                ⚠️ Primero debes cargar la BD Sisnet (Paso 1)
                            </p>
                        </div>
                    )}

                    {/* Insurer Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">Aseguradora</label>
                        <select
                            value={selectedInsurer}
                            onChange={(e) => setSelectedInsurer(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            disabled={!status?.loaded}
                        >
                            <option value="">-- Seleccionar aseguradora --</option>
                            {insurers.filter(i => i.enabled).map((ins) => (
                                <option key={ins.key} value={ins.key}>{ins.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* File Upload */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">Archivo EECC de Aseguradora</label>
                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={(e) => setInsurerFile(e.target.files?.[0] || null)}
                            disabled={!selectedInsurer}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer disabled:opacity-50"
                        />
                    </div>

                    {/* Process Button */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => setStep(1)}
                            className="btn btn-secondary"
                        >
                            ← Volver
                        </button>
                        <button
                            onClick={handleProcess}
                            disabled={!selectedInsurer || !insurerFile || processing}
                            className="btn btn-primary flex-1"
                        >
                            {processing ? '⏳ Procesando...' : '🔄 Procesar Conciliación'}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Results */}
            {step === 3 && result && (
                <div className="card">
                    <h3 className="font-semibold mb-4">Paso 3: Resultados</h3>

                    <div className={`p-6 rounded-lg text-center mb-6 ${
                        result.ok ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                        <div className="text-5xl mb-4">
                            {result.ok ? '✅' : '❌'}
                        </div>
                        <h4 className="text-xl font-semibold mb-2">
                            {result.ok ? 'Conciliación completada' : 'Error en la conciliación'}
                        </h4>
                    </div>

                    {result.ok && result.stats && (
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="p-4 bg-gray-50 rounded-lg text-center">
                                <p className="text-2xl font-bold">{result.stats.totalRows}</p>
                                <p className="text-sm text-gray-500">Total filas</p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg text-center">
                                <p className="text-2xl font-bold text-green-700">{result.stats.matched}</p>
                                <p className="text-sm text-green-600">Coincidentes</p>
                            </div>
                            <div className="p-4 bg-yellow-50 rounded-lg text-center">
                                <p className="text-2xl font-bold text-yellow-700">{result.stats.unmatched}</p>
                                <p className="text-sm text-yellow-600">Sin coincidencia</p>
                            </div>
                        </div>
                    )}

                    {result.ok && result.exports && (
                        <div className="space-y-2 mb-6">
                            <h4 className="font-medium">Archivos generados:</h4>
                            {result.exports.cruceUrl && (
                                <a
                                    href={result.exports.cruceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                                >
                                    📊 Reporte de Cruce ↗
                                </a>
                            )}
                            {result.exports.reportUrl && (
                                <a
                                    href={result.exports.reportUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                                >
                                    📄 Reporte Detallado ↗
                                </a>
                            )}
                        </div>
                    )}

                    {!result.ok && (
                        <p className="text-red-600 mb-6">{result.error}</p>
                    )}

                    <button
                        onClick={() => {
                            setStep(2);
                            setResult(null);
                            setInsurerFile(null);
                        }}
                        className="btn btn-primary w-full"
                    >
                        Nueva Conciliación
                    </button>
                </div>
            )}
        </div>
    );
}

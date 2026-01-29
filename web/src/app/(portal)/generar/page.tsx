'use client';

import { useState, useEffect } from 'react';

interface PreviewData {
    headers: string[];
    rows: Array<Array<string | number | null>>;
    total: number;
    rams: string[];
}

interface GenerateResult {
    ok: boolean;
    pdfUrl?: string;
    xlsxUrl?: string;
    error?: string;
}

/**
 * Generar EECC Page
 * 
 * Generate Estado de Cuenta documents
 */
export default function GenerarPage() {
    const [mode, setMode] = useState<'asegurado' | 'grupo'>('asegurado');
    const [asegurados, setAsegurados] = useState<string[]>([]);
    const [grupos, setGrupos] = useState<string[]>([]);
    const [selectedAsegurado, setSelectedAsegurado] = useState('');
    const [selectedGrupo, setSelectedGrupo] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    
    const [exportType, setExportType] = useState<'both' | 'pdf' | 'xlsx'>('both');
    const [includeObs, setIncludeObs] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState<GenerateResult | null>(null);
    const [generatedFiles, setGeneratedFiles] = useState<Array<{ name: string; url: string; type: string }>>([]);

    // Load asegurados on mount
    useEffect(() => {
        loadAsegurados();
    }, []);

    // Load grupos when switching to grupo mode
    useEffect(() => {
        if (mode === 'grupo' && grupos.length === 0) {
            loadGrupos();
        }
    }, [mode, grupos.length]);

    async function loadAsegurados() {
        try {
            const res = await fetch('/api/eecc/asegurados');
            const data = await res.json();
            if (data.ok) {
                setAsegurados(data.data || []);
            }
        } catch (error) {
            console.error('Error loading asegurados:', error);
        }
    }

    async function loadGrupos() {
        try {
            const res = await fetch('/api/eecc/grupos');
            const data = await res.json();
            if (data.ok) {
                setGrupos(data.data || []);
            }
        } catch (error) {
            console.error('Error loading grupos:', error);
        }
    }

    async function handlePreview() {
        const target = mode === 'asegurado' ? selectedAsegurado : selectedGrupo;
        if (!target) return;

        setLoadingPreview(true);
        setPreview(null);

        try {
            const res = await fetch('/api/eecc/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    asegurado: selectedAsegurado,
                    maxRows: 200,
                    includeObs,
                }),
            });
            const data = await res.json();
            if (data.ok) {
                setPreview(data.data);
            }
        } catch (error) {
            console.error('Preview error:', error);
        } finally {
            setLoadingPreview(false);
        }
    }

    async function handleGenerate() {
        const target = mode === 'asegurado' ? selectedAsegurado : selectedGrupo;
        if (!target) return;

        setGenerating(true);
        setResult(null);

        try {
            const res = await fetch('/api/eecc/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    asegurado: mode === 'asegurado' ? selectedAsegurado : undefined,
                    grupo: mode === 'grupo' ? selectedGrupo : undefined,
                    options: {
                        exportPdf: exportType === 'both' || exportType === 'pdf',
                        exportXlsx: exportType === 'both' || exportType === 'xlsx',
                        includeObs,
                    },
                }),
            });
            const data = await res.json();
            setResult(data);

            if (data.ok && data.data) {
                const files: Array<{ name: string; url: string; type: string }> = [];
                if (data.data.pdfUrl) {
                    files.push({ name: `EECC_${target}.pdf`, url: data.data.pdfUrl, type: 'pdf' });
                }
                if (data.data.xlsxUrl) {
                    files.push({ name: `EECC_${target}.xlsx`, url: data.data.xlsxUrl, type: 'xlsx' });
                }
                setGeneratedFiles(prev => [...files, ...prev]);
            }
        } catch (error) {
            setResult({ ok: false, error: 'Error de conexión' });
        } finally {
            setGenerating(false);
        }
    }

    const filteredAsegurados = asegurados.filter(a => 
        a.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    📄 Generar Estado de Cuenta
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Genera documentos EECC en PDF y/o Excel
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card">
                        {/* Mode Toggle */}
                        <div className="flex gap-4 mb-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={mode === 'asegurado'}
                                    onChange={() => setMode('asegurado')}
                                    className="text-red-600"
                                />
                                <span>👤 Por Asegurado</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={mode === 'grupo'}
                                    onChange={() => setMode('grupo')}
                                    className="text-red-600"
                                />
                                <span>👥 Por Grupo</span>
                            </label>
                        </div>

                        {/* Asegurado Selector */}
                        {mode === 'asegurado' && (
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Seleccionar Asegurado
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchTerm || selectedAsegurado}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setSelectedAsegurado('');
                                            setShowDropdown(true);
                                        }}
                                        onFocus={() => setShowDropdown(true)}
                                        placeholder="Escribe o selecciona un cliente..."
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        🔍
                                    </span>
                                </div>

                                {showDropdown && (
                                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {filteredAsegurados.slice(0, 100).map((a) => (
                                            <button
                                                key={a}
                                                onClick={() => {
                                                    setSelectedAsegurado(a);
                                                    setSearchTerm('');
                                                    setShowDropdown(false);
                                                    setPreview(null);
                                                }}
                                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                {a}
                                            </button>
                                        ))}
                                        {filteredAsegurados.length === 0 && (
                                            <div className="px-4 py-2 text-sm text-gray-500">
                                                No se encontraron resultados
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Grupo Selector */}
                        {mode === 'grupo' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Seleccionar Grupo Económico
                                </label>
                                <select
                                    value={selectedGrupo}
                                    onChange={(e) => setSelectedGrupo(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                                >
                                    <option value="">-- Seleccionar grupo --</option>
                                    {grupos.map((g) => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handlePreview}
                                disabled={loadingPreview || (!selectedAsegurado && !selectedGrupo)}
                                className="btn btn-secondary"
                            >
                                {loadingPreview ? '⏳' : '👁'} Previsualizar
                            </button>
                            <button
                                onClick={() => setIncludeObs(!includeObs)}
                                className={`btn ${includeObs ? 'btn-primary' : 'btn-secondary'}`}
                            >
                                📝 {includeObs ? 'OBS Activo' : 'Agregar OBS'}
                            </button>
                        </div>

                        {/* Export Options */}
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Formato de exportación
                            </label>
                            <div className="flex gap-4">
                                {[
                                    { value: 'both', label: '📄📊 PDF + XLSX' },
                                    { value: 'pdf', label: '📄 Solo PDF' },
                                    { value: 'xlsx', label: '📊 Solo XLSX' },
                                ].map((opt) => (
                                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="exportType"
                                            checked={exportType === opt.value}
                                            onChange={() => setExportType(opt.value as typeof exportType)}
                                            className="text-red-600"
                                        />
                                        <span className="text-sm">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={generating || (!selectedAsegurado && !selectedGrupo)}
                            className="btn btn-primary w-full mt-6"
                        >
                            {generating ? (
                                <>⏳ Generando...</>
                            ) : (
                                <>⚙️ Generar EECC</>
                            )}
                        </button>

                        {/* Result */}
                        {result && (
                            <div className={`mt-4 p-4 rounded-lg ${
                                result.ok 
                                    ? 'bg-green-50 border border-green-200 text-green-800'
                                    : 'bg-red-50 border border-red-200 text-red-800'
                            }`}>
                                {result.ok ? '✅ EECC generado correctamente' : `❌ ${result.error}`}
                            </div>
                        )}
                    </div>

                    {/* Preview Table */}
                    {preview && (
                        <div className="card">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold">Pre-visualización de datos</h3>
                                <span className="text-sm text-gray-500">{preview.total} registros</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-800">
                                            {preview.headers.map((h, i) => (
                                                <th key={i} className="px-3 py-2 text-left font-medium text-gray-600">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.rows.slice(0, 10).map((row, i) => (
                                            <tr key={i} className="border-t border-gray-200 dark:border-gray-700">
                                                {row.map((cell, j) => (
                                                    <td key={j} className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                                        {cell ?? '-'}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {preview.rows.length > 10 && (
                                <p className="text-sm text-gray-500 mt-3">
                                    Mostrando 10 de {preview.total} registros
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Generated Files Sidebar */}
                <div className="lg:col-span-1">
                    <div className="card sticky top-6">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            📁 Archivos Generados
                            {generatedFiles.length > 0 && (
                                <span className="badge badge-info">{generatedFiles.length}</span>
                            )}
                        </h3>
                        
                        {generatedFiles.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                Los archivos generados aparecerán aquí
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {generatedFiles.map((file, i) => (
                                    <a
                                        key={i}
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <span className="text-xl">
                                            {file.type === 'pdf' ? '📄' : '📊'}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{file.name}</p>
                                            <p className="text-xs text-gray-500 uppercase">{file.type}</p>
                                        </div>
                                        <span className="text-gray-400">↗</span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

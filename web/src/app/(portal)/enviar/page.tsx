'use client';

import { useState, useEffect } from 'react';

interface MailTemplate {
    id: string;
    name: string;
    subject: string;
}

interface QueueHealth {
    status: 'OK' | 'WARNING' | 'ERROR';
    pending: number;
    processing: number;
}

interface SendResult {
    ok: boolean;
    sent?: number;
    failed?: number;
    errors?: Array<{ aseguradoId: string; error: string }>;
    error?: { message: string };
}

/**
 * Enviar Correos Page
 * 
 * Send EECC emails to asegurados
 */
export default function EnviarPage() {
    const [step, setStep] = useState(1);
    const [asegurados, setAsegurados] = useState<string[]>([]);
    const [templates, setTemplates] = useState<MailTemplate[]>([]);
    const [queueHealth, setQueueHealth] = useState<QueueHealth | null>(null);
    
    // Selection state
    const [selectedAsegurados, setSelectedAsegurados] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    
    // Options state
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [adjuntarPdf, setAdjuntarPdf] = useState(true);
    const [adjuntarXlsx, setAdjuntarXlsx] = useState(true);
    
    // Sending state
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<SendResult | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [asegRes, tplRes, qhRes] = await Promise.all([
                fetch('/api/eecc/asegurados'),
                fetch('/api/mail/templates'),
                fetch('/api/mail/queue-health'),
            ]);

            if (asegRes.ok) {
                const data = await asegRes.json();
                if (data.ok) setAsegurados(data.data || []);
            }

            if (tplRes.ok) {
                const data = await tplRes.json();
                if (data.ok) setTemplates(data.data || []);
            }

            if (qhRes.ok) {
                const data = await qhRes.json();
                if (data.ok) setQueueHealth(data.data);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    function toggleAsegurado(asegurado: string) {
        setSelectedAsegurados(prev => {
            const next = new Set(prev);
            if (next.has(asegurado)) {
                next.delete(asegurado);
            } else {
                next.add(asegurado);
            }
            return next;
        });
    }

    function selectAll() {
        setSelectedAsegurados(new Set(filteredAsegurados));
    }

    function clearSelection() {
        setSelectedAsegurados(new Set());
    }

    async function handleTestSend() {
        if (selectedAsegurados.size === 0) return;
        
        const first = Array.from(selectedAsegurados)[0];
        setSending(true);

        try {
            const res = await fetch('/api/mail/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aseguradoId: first }),
            });
            const data = await res.json();
            if (data.ok) {
                alert('Correo de prueba enviado a tu bandeja');
            } else {
                alert(`Error: ${data.error?.message}`);
            }
        } catch (error) {
            alert('Error de conexión');
        } finally {
            setSending(false);
        }
    }

    async function handleSend() {
        if (selectedAsegurados.size === 0) return;
        
        setSending(true);
        setResult(null);

        try {
            const items = Array.from(selectedAsegurados).map(id => ({ aseguradoId: id }));
            
            const res = await fetch('/api/mail/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items,
                    options: {
                        templateId: selectedTemplate || undefined,
                        adjuntarPdf,
                        adjuntarXlsx,
                    },
                }),
            });
            
            const data = await res.json();
            setResult(data);
            
            if (data.ok) {
                setStep(3); // Go to results
            }
        } catch (error) {
            setResult({ ok: false, error: { message: 'Error de conexión' } });
        } finally {
            setSending(false);
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
                    📧 Enviar EECC por Correo
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Envía estados de cuenta por correo electrónico
                </p>
            </div>

            {/* Queue Health Banner */}
            {queueHealth && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${
                    queueHealth.status === 'OK' ? 'bg-green-50 border border-green-200' :
                    queueHealth.status === 'WARNING' ? 'bg-yellow-50 border border-yellow-200' :
                    'bg-red-50 border border-red-200'
                }`}>
                    <span className="text-2xl">
                        {queueHealth.status === 'OK' ? '✅' : queueHealth.status === 'WARNING' ? '⚠️' : '❌'}
                    </span>
                    <div>
                        <p className="font-medium">Estado de Cola: {queueHealth.status}</p>
                        <p className="text-sm text-gray-600">
                            {queueHealth.pending} pendientes • {queueHealth.processing} procesando
                        </p>
                    </div>
                </div>
            )}

            {/* Stepper */}
            <div className="flex items-center gap-4 mb-6">
                {[
                    { num: 1, label: 'Selección' },
                    { num: 2, label: 'Configuración' },
                    { num: 3, label: 'Resultado' },
                ].map((s, i) => (
                    <div key={s.num} className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            step >= s.num 
                                ? 'bg-red-600 text-white' 
                                : 'bg-gray-200 text-gray-600'
                        }`}>
                            {step > s.num ? '✓' : s.num}
                        </div>
                        <span className={`text-sm ${step >= s.num ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                            {s.label}
                        </span>
                        {i < 2 && <div className="w-12 h-0.5 bg-gray-200" />}
                    </div>
                ))}
            </div>

            {/* Step 1: Selection */}
            {step === 1 && (
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Seleccionar Destinatarios</h3>
                        <div className="flex gap-2">
                            <button onClick={selectAll} className="text-sm text-red-600 hover:underline">
                                Seleccionar todos
                            </button>
                            <button onClick={clearSelection} className="text-sm text-gray-500 hover:underline">
                                Limpiar
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar asegurado..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                    />

                    {/* Selection Count */}
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="text-sm">
                            {selectedAsegurados.size} de {filteredAsegurados.length} seleccionados
                        </span>
                    </div>

                    {/* Asegurados List */}
                    <div className="max-h-80 overflow-y-auto space-y-1">
                        {filteredAsegurados.slice(0, 100).map((a) => (
                            <label
                                key={a}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                    selectedAsegurados.has(a)
                                        ? 'bg-red-50 border border-red-200'
                                        : 'hover:bg-gray-50'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedAsegurados.has(a)}
                                    onChange={() => toggleAsegurado(a)}
                                    className="w-4 h-4 text-red-600 rounded"
                                />
                                <span className="text-sm">{a}</span>
                            </label>
                        ))}
                    </div>

                    <button
                        onClick={() => setStep(2)}
                        disabled={selectedAsegurados.size === 0}
                        className="btn btn-primary w-full mt-6"
                    >
                        Continuar → Configuración
                    </button>
                </div>
            )}

            {/* Step 2: Configuration */}
            {step === 2 && (
                <div className="card">
                    <h3 className="font-semibold mb-4">Configurar Envío</h3>

                    {/* Summary */}
                    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm">
                            <strong>{selectedAsegurados.size}</strong> destinatarios seleccionados
                        </p>
                    </div>

                    {/* Template Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">Plantilla de correo</label>
                        <select
                            value={selectedTemplate}
                            onChange={(e) => setSelectedTemplate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        >
                            <option value="">Plantilla por defecto</option>
                            {templates.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Attachments */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">Adjuntos</label>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={adjuntarPdf}
                                    onChange={(e) => setAdjuntarPdf(e.target.checked)}
                                    className="w-4 h-4 text-red-600 rounded"
                                />
                                <span className="text-sm">📄 Adjuntar PDF</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={adjuntarXlsx}
                                    onChange={(e) => setAdjuntarXlsx(e.target.checked)}
                                    className="w-4 h-4 text-red-600 rounded"
                                />
                                <span className="text-sm">📊 Adjuntar Excel</span>
                            </label>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => setStep(1)}
                            className="btn btn-secondary"
                        >
                            ← Volver
                        </button>
                        <button
                            onClick={handleTestSend}
                            disabled={sending}
                            className="btn btn-secondary"
                        >
                            🧪 Enviar Prueba
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={sending}
                            className="btn btn-primary flex-1"
                        >
                            {sending ? '⏳ Enviando...' : `📧 Enviar ${selectedAsegurados.size} Correos`}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Results */}
            {step === 3 && result && (
                <div className="card">
                    <h3 className="font-semibold mb-4">Resultado del Envío</h3>

                    <div className={`p-6 rounded-lg text-center ${
                        result.ok ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                        <div className="text-5xl mb-4">
                            {result.ok ? '✅' : '❌'}
                        </div>
                        <h4 className="text-xl font-semibold mb-2">
                            {result.ok ? 'Envío completado' : 'Error en el envío'}
                        </h4>
                        {result.ok && (
                            <p className="text-gray-600">
                                {result.sent} enviados • {result.failed} fallidos
                            </p>
                        )}
                        {!result.ok && (
                            <p className="text-red-600">{result.error?.message}</p>
                        )}
                    </div>

                    {/* Error Details */}
                    {result.errors && result.errors.length > 0 && (
                        <div className="mt-6">
                            <h4 className="font-medium mb-3">Errores ({result.errors.length})</h4>
                            <div className="max-h-40 overflow-y-auto space-y-2">
                                {result.errors.map((e, i) => (
                                    <div key={i} className="p-3 bg-red-50 rounded-lg text-sm">
                                        <strong>{e.aseguradoId}:</strong> {e.error}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            setStep(1);
                            setSelectedAsegurados(new Set());
                            setResult(null);
                        }}
                        className="btn btn-primary w-full mt-6"
                    >
                        Nuevo Envío
                    </button>
                </div>
            )}
        </div>
    );
}

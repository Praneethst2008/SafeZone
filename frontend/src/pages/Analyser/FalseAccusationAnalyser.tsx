import React, { useState, useRef } from 'react';
import Header from "../../components/Header";
import NavBar from "../../components/NavBar";
import { ArrowLeft, Upload, Send, FileText, AlertTriangle, CheckCircle, Info, MessageSquare, Trash2, X } from 'lucide-react';

interface AnalysisResult {
    verdict: 'consistent' | 'minor_anomalies' | 'major_anomalies' | 'insufficient_data';
    confidence: 'Low' | 'Medium' | 'High';
    observations: string[];
    flaggedSections?: { quote: string; issue: string }[];
    fullAnalysis: string;
    legalContext?: string;
}

interface CaseRecord {
    _id: string;
    analysis: AnalysisResult;
    description: string;
}

const FalseAccusationAnalyser = ({ setPage }: { setPage: (p: string) => void }) => {
    const [step, setStep] = useState<'input' | 'analyzing' | 'report'>('input');

    // Input State
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [context, setContext] = useState('');
    const [notes, setNotes] = useState('');
    const [files, setFiles] = useState<File[]>([]);

    // Result State
    const [result, setResult] = useState<CaseRecord | null>(null);
    const [error, setError] = useState('');

    // History State
    const [history, setHistory] = useState<CaseRecord[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Chat State
    const [chatMessage, setChatMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
    const [chatLoading, setChatLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setHistoryLoading(true);
            const token = localStorage.getItem("token");
            const res = await fetch('http://localhost:5000/api/analyzer', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (err) {
            console.error("Failed to fetch history", err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const deleteCase = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent opening the case
        if (!window.confirm("Are you sure you want to delete this analysis?")) return;

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:5000/api/analyzer/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setHistory(prev => prev.filter(h => h._id !== id));
                if (result && result._id === id) {
                    setResult(null);
                    setStep('input');
                }
            }
        } catch (err) {
            console.error("Failed to delete case", err);
        }
    };

    const loadCase = (record: CaseRecord) => {
        setResult(record);
        setDescription(record.description);
        // Reset chat when loading a new case
        setChatHistory([]);
        setStep('report');
        setShowHistory(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const submitCase = async () => {
        if (!description) return setError("Description is required");

        setStep('analyzing');
        setError('');

        try {
            const formData = new FormData();
            formData.append('description', description);
            formData.append('date', date);
            formData.append('context', context);
            formData.append('notes', notes);
            files.forEach(f => formData.append('evidence', f));

            const token = localStorage.getItem("token");
            const res = await fetch('http://localhost:5000/api/analyzer', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) {
                if (res.status === 503) throw new Error("AI Service Unavailable (Check API Key)");
                throw new Error("Analysis failed");
            }

            const data = await res.json();
            setResult(data);
            setStep('report');
            fetchHistory(); // Refresh history
        } catch (err: any) {
            setError(err.message || "Something went wrong");
            setStep('input');
        }
    };

    const checkRelevance = (query: string, caseData: CaseRecord): boolean => {
        // 1. Common legal/analysis terms that are always allowed
        const allowedTerms = ['legal', 'law', 'bns', 'ipc', 'section', 'court', 'police', 'analysis', 'report', 'verdict', 'consistent', 'contradiction', 'truth', 'lie', 'evidence', 'what', 'why', 'how', 'explain'];

        // 2. Extract keywords from Case Description and Analysis
        const caseText = (caseData.description + " " + (caseData.analysis.fullAnalysis || "")).toLowerCase();

        // Simple tokenization
        const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);

        if (queryWords.length === 0) return true; // Short queries might be "Why?", "Explain" - allow them

        // Parametric check:
        // A. If query contains any allowed term -> Pass
        const hasAllowedTerm = queryWords.some(w => allowedTerms.some(term => w.includes(term) || term.includes(w)));
        if (hasAllowedTerm) return true;

        // B. If query words overlap with Case Text -> Pass
        const hasContextOverlap = queryWords.some(w => caseText.includes(w));

        return hasContextOverlap;
    };

    const sendChatMessage = async () => {
        if (!chatMessage.trim() || !result) return;

        const userMsg = chatMessage;
        setChatMessage('');

        // Relevance Check to Save Credits
        if (!checkRelevance(userMsg, result)) {
            setChatHistory(prev => [...prev,
            { role: 'user', content: userMsg },
            { role: 'ai', content: "⚠️ To save resources, I can only answer questions related to this specific case or legal analysis. Please refine your question." }
            ]);
            return;
        }

        setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
        setChatLoading(true);

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:5000/api/analyzer/${result._id}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: userMsg })
            });

            const data = await res.json();
            setChatHistory(prev => [...prev, { role: 'ai', content: data.reply }]);
        } catch (err) {
            setChatHistory(prev => [...prev, { role: 'ai', content: "Error connecting to assistant." }]);
        } finally {
            setChatLoading(false);
        }
    };

    const getVerdictBadge = (v: string) => {
        switch (v) {
            case 'consistent': return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1"><CheckCircle size={16} /> Consistent</span>;
            case 'minor_anomalies': return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1"><Info size={16} /> Minor Issues</span>;
            case 'major_anomalies': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1"><AlertTriangle size={16} /> Major Issues</span>;
            default: return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-bold">Inconclusive</span>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24 pt-20 relative overflow-hidden">
            <Header onNavigate={setPage} />

            {/* History Sidebar - Slide Over */}
            <div className={`fixed inset-y-0 right-0 w-80 bg-white shadow-2xl transform transition-transform duration-300 z-50 overflow-y-auto ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 sticky top-0 z-10">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><FileText size={18} /> History</h3>
                    <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-red-500 p-1 hover:bg-red-50 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-4 space-y-3">
                    {historyLoading ? (
                        <div className="text-center text-gray-400 py-10">Loading history...</div>
                    ) : history.length === 0 ? (
                        <div className="text-center text-gray-400 py-10">No past analyses found.</div>
                    ) : (
                        history.map((record) => (
                            <div
                                key={record._id}
                                onClick={() => loadCase(record)}
                                className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition border-l-4 border-l-transparent hover:border-l-red-500 group relative bg-white shadow-sm"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${record.analysis?.verdict === 'consistent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {record.analysis?.verdict ? record.analysis.verdict.replace('_', ' ') : 'Unknown'}
                                    </span>
                                    <button
                                        onClick={(e) => deleteCase(e, record._id)}
                                        className="text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100 p-1"
                                        title="Delete Report"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <p className="text-sm text-gray-700 line-clamp-2 font-medium mb-1 pr-4">{record.description}</p>
                                <p className="text-xs text-gray-400">View Report</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Overlay for Sidebar */}
            {showHistory && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity" onClick={() => setShowHistory(false)}></div>}

            {/* Top Toolbar */}
            <div className="px-4 mb-4 flex justify-between items-center max-w-3xl mx-auto">
                <button onClick={() => step === 'input' ? setPage('home') : setStep('input')} className="flex items-center text-gray-600 gap-1 hover:text-gray-900">
                    <ArrowLeft size={20} /> Back
                </button>

                <button
                    onClick={() => setShowHistory(true)}
                    className="flex items-center gap-2 text-sm font-semibold text-red-600 bg-white px-4 py-2 rounded-full shadow-sm hover:shadow-md transition"
                >
                    <FileText size={16} /> Past Analyses
                </button>
            </div>

            <div className="px-4 max-w-3xl mx-auto">
                <h1 className="text-2xl font-bold text-red-600 mb-2">False Accusation Analyzer</h1>
                <p className="text-gray-500 text-sm mb-6">AI-powered analysis to detect inconsistencies and truthfulness markers.</p>

                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

                {step === 'input' && (
                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                            <label className="block text-sm font-medium text-gray-700">Case Description *</label>
                            <textarea
                                className="w-full border rounded-lg p-3 h-32 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                                placeholder="Describe the incident in detail..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Date/Time</label>
                                    <input
                                        type="text"
                                        className="w-full border rounded-lg p-2 text-sm"
                                        placeholder="e.g. Last Friday 10PM"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Context</label>
                                    <input
                                        type="text"
                                        className="w-full border rounded-lg p-2 text-sm"
                                        placeholder="e.g. Argument at work"
                                        value={context}
                                        onChange={e => setContext(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg p-2 text-sm"
                                    placeholder="Any other relevant details..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Evidence (Optional)</label>
                                <div
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload size={24} className="mb-2" />
                                    <span className="text-xs">{files.length > 0 ? `${files.length} files selected` : "Upload Images/Audio/Docs"}</span>
                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={submitCase}
                            className="w-full bg-red-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-red-700 transition"
                        >
                            Analyze Case
                        </button>
                    </div>
                )}

                {step === 'analyzing' && (
                    <div className="flex flex-col items-center justify-center h-64">
                        <div className="w-16 h-16 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-600 font-medium">Analyzing patterns...</p>
                        <p className="text-gray-400 text-xs mt-2">This may take a few seconds.</p>
                    </div>
                )}

                {step === 'report' && result && (
                    <div className="space-y-6">
                        {/* Verdict Card */}
                        <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-red-500">
                            <div className="flex justify-between items-start mb-2">
                                <h2 className="text-lg font-bold text-gray-800">Analysis Verdict</h2>
                                {getVerdictBadge(result.analysis.verdict)}
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{result.analysis.fullAnalysis}</p>

                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>Confidence:</span>
                                <span className={`font-bold ${result.analysis.confidence === 'High' ? 'text-green-600' : 'text-yellow-600'}`}>
                                    {result.analysis.confidence}
                                </span>
                            </div>
                        </div>

                        {/* Legal Context Highlight */}
                        {result.analysis.legalContext && (
                            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1"><Info size={20} className="text-blue-600" /></div>
                                    <div>
                                        <h3 className="font-bold text-blue-800 text-sm">Legal Context (India)</h3>
                                        <p className="text-sm text-blue-700 mt-1 whitespace-pre-wrap">{result.analysis.legalContext}</p>
                                        <p className="text-[10px] text-blue-400 mt-2 uppercase font-semibold">For Information Only • Not Legal Advice</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Observations */}
                        <div className="bg-white p-5 rounded-xl shadow-md">
                            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <FileText size={18} className="text-red-500" /> Key Observations
                            </h3>
                            <ul className="space-y-2">
                                {result.analysis.observations.map((obs, i) => (
                                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                                        <span className="text-red-400">•</span> {obs}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Chatbot */}
                        <div className="bg-white p-5 rounded-xl shadow-md">
                            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <MessageSquare size={18} className="text-red-500" /> AI Assistant
                            </h3>

                            <div className="bg-gray-50 rounded-lg p-3 h-48 overflow-y-auto mb-3 space-y-3">
                                {chatHistory.length === 0 && <p className="text-gray-400 text-xs text-center mt-4">Ask specifically about this report.</p>}
                                {chatHistory.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-2 rounded-lg text-sm ${msg.role === 'user' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {chatLoading && <div className="text-xs text-gray-400">Thinking...</div>}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500"
                                    placeholder="Ask a question..."
                                    value={chatMessage}
                                    onChange={e => setChatMessage(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                                />
                                <button onClick={sendChatMessage} className="bg-red-600 text-white p-2 rounded-lg">
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <NavBar onNavigate={setPage} />
        </div>
    );
};

export default FalseAccusationAnalyser;

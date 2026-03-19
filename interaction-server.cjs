try { require('dotenv').config(); } catch(e) {}

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3001;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');
const KB_PATH = path.join(__dirname, 'src', 'data', 'knowledgeBase.md');
const FEEDBACK_QUEUE_PATH = path.join(DATA_DIR, 'feedbackQueue.json');
const KB_VERSIONS_PATH = path.join(DATA_DIR, 'kbVersions.json');
const SNAPSHOTS_DIR = path.join(DATA_DIR, 'snapshots');
const BASE_PROCESSES_PATH = path.join(DATA_DIR, 'base_processes.json');
const PROCESSES_PATH = path.join(DATA_DIR, 'processes.json');

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

let state = { sent: false, confirmed: false, signals: {} };
let runningProcesses = new Map();

// Init files on startup
if (!fs.existsSync(PROCESSES_PATH) && fs.existsSync(BASE_PROCESSES_PATH)) {
    fs.copyFileSync(BASE_PROCESSES_PATH, PROCESSES_PATH);
}
if (!fs.existsSync(path.join(__dirname, 'interaction-signals.json'))) {
    fs.writeFileSync(path.join(__dirname, 'interaction-signals.json'), JSON.stringify({ APPROVE_BOOKING: false, APPROVE_EXTRACTION: false }, null, 4));
}
if (!fs.existsSync(FEEDBACK_QUEUE_PATH)) {
    fs.writeFileSync(FEEDBACK_QUEUE_PATH, '[]');
}
if (!fs.existsSync(KB_VERSIONS_PATH)) {
    fs.writeFileSync(KB_VERSIONS_PATH, '[]');
}
if (!fs.existsSync(SNAPSHOTS_DIR)) {
    fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
}

const getMimeType = (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const mimes = {
        '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
        '.jsx': 'application/javascript', '.json': 'application/json',
        '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf', '.webm': 'video/webm', '.ico': 'image/x-icon',
        '.md': 'text/markdown', '.woff': 'font/woff', '.woff2': 'font/woff2'
    };
    return mimes[ext] || 'text/plain';
};

const readJson = (file) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 4));

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const cleanPath = url.pathname;

    if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders);
        res.end();
        return;
    }

    // ---- RESET ----
    if (cleanPath === '/reset') {
        state = { sent: false, confirmed: false, signals: {} };
        const signalFile = path.join(__dirname, 'interaction-signals.json');
        fs.writeFileSync(signalFile, JSON.stringify({ APPROVE_BOOKING: false, APPROVE_EXTRACTION: false }, null, 4));

        runningProcesses.forEach((proc) => { try { process.kill(-proc.pid, 'SIGKILL'); } catch(e) {} });
        runningProcesses.clear();

        exec('pkill -9 -f "node(.*)simulation_scripts" || true', (err) => {
            setTimeout(() => {
                const cases = [
                    {
                        id: "DXC_PREPAID_001",
                        name: "Accruals - Q1 2026 SAP Report",
                        category: "Prepaid - Data Ingestion & Invoice Extraction",
                        stockId: "SAP-Q1-2026",
                        year: new Date().toISOString().split('T')[0],
                        status: "In Progress",
                        currentStatus: "Initializing...",
                        vendor: "SAP S/4HANA",
                        entity: "DXC Technology"
                    },
                    {
                        id: "DXC_PREPAID_002",
                        name: "Insurance Premium - Marsh McLennan",
                        category: "Prepaid - Data Ingestion & Invoice Extraction",
                        stockId: "INS-2026-MM",
                        year: new Date().toISOString().split('T')[0],
                        status: "In Progress",
                        currentStatus: "Initializing...",
                        vendor: "Marsh McLennan",
                        entity: "DXC Technology"
                    },
                    {
                        id: "DXC_EXPENSE_001",
                        name: "Software License Amortization - Q1",
                        category: "Prepaid - Expense Booking",
                        stockId: "SLA-Q1-2026",
                        year: new Date().toISOString().split('T')[0],
                        status: "In Progress",
                        currentStatus: "Initializing...",
                        vendor: "Microsoft EA",
                        entity: "DXC Technology"
                    },
                    {
                        id: "DXC_EXPENSE_002",
                        name: "Maintenance Contract - HPE",
                        category: "Prepaid - Expense Booking",
                        stockId: "MTC-HPE-2026",
                        year: new Date().toISOString().split('T')[0],
                        status: "In Progress",
                        currentStatus: "Initializing...",
                        vendor: "Hewlett Packard Enterprise",
                        entity: "DXC Technology"
                    }
                ];
                fs.writeFileSync(PROCESSES_PATH, JSON.stringify(cases, null, 4));
                fs.writeFileSync(FEEDBACK_QUEUE_PATH, '[]');
                fs.writeFileSync(KB_VERSIONS_PATH, '[]');

                const scripts = [
                    { file: 'prepaid_ingestion_001.cjs', id: 'DXC_PREPAID_001' },
                    { file: 'prepaid_ingestion_002.cjs', id: 'DXC_PREPAID_002' },
                    { file: 'expense_booking_001.cjs', id: 'DXC_EXPENSE_001' },
                    { file: 'expense_booking_002.cjs', id: 'DXC_EXPENSE_002' }
                ];

                let totalDelay = 0;
                scripts.forEach((script) => {
                    setTimeout(() => {
                        const scriptPath = path.join(__dirname, 'simulation_scripts', script.file);
                        const child = exec(`node "${scriptPath}" > "${scriptPath}.log" 2>&1`, (error) => {
                            if (error && error.code !== 0) console.error(`${script.file} error:`, error.message);
                            runningProcesses.delete(script.id);
                        });
                        runningProcesses.set(script.id, child);
                    }, totalDelay * 1000);
                    totalDelay += 2;
                });
            }, 1000);
        });

        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }

    // ---- EMAIL STATUS ----
    if (cleanPath === '/email-status') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try { const d = JSON.parse(body); if (d.sent !== undefined) state.sent = d.sent; } catch(e) {}
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            });
        } else {
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ sent: state.sent }));
        }
        return;
    }

    // ---- SIGNAL STATUS ----
    if (cleanPath === '/signal-status') {
        const signalFile = path.join(__dirname, 'interaction-signals.json');
        let signals = {};
        try { signals = JSON.parse(fs.readFileSync(signalFile, 'utf8')); } catch(e) {}
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(signals));
        return;
    }

    // ---- SIGNAL ----
    if (cleanPath === '/signal' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const parsed = JSON.parse(body);
                // Support both { signalId } (legacy) and { signal } (frontend usage)
                const signalId = parsed.signalId || parsed.signal;
                const signalFile = path.join(__dirname, 'interaction-signals.json');
                let signals = {};
                try { signals = JSON.parse(fs.readFileSync(signalFile, 'utf8')); } catch(e) {}
                if (signalId) signals[signalId] = true;
                fs.writeFileSync(signalFile, JSON.stringify(signals, null, 4));

                // GL HITL signals — transition DXC_EXPENSE_001 to Done and record decision
                const glSignals = ['gl_confirm_110091', 'gl_confirm_110092', 'gl_confirm_split', 'gl_escalate_finance'];
                if (signalId && glSignals.includes(signalId)) {
                    const glLabels = {
                        gl_confirm_110091: 'GL 110091 — Prepaid Enterprise Software Licenses',
                        gl_confirm_110092: 'GL 110092 — Prepaid CRM & Business Intelligence Software',
                        gl_confirm_split: 'Split: 70% GL 110091 / 30% GL 110093',
                        gl_escalate_finance: 'Escalated to Finance Controller'
                    };
                    const newStatus = signalId === 'gl_escalate_finance' ? 'Needs Attention' : 'Done';
                    const currentLabel = glLabels[signalId] || signalId;

                    if (fs.existsSync(PROCESSES_PATH)) {
                        const processes = JSON.parse(fs.readFileSync(PROCESSES_PATH, 'utf8'));
                        const idx = processes.findIndex(p => p.id === 'DXC_EXPENSE_001');
                        if (idx !== -1) {
                            processes[idx].status = newStatus;
                            processes[idx].currentStatus = `Human confirmed: ${currentLabel}`;
                            fs.writeFileSync(PROCESSES_PATH, JSON.stringify(processes, null, 4));
                        }
                    }

                    // Also update the process log detail file if it exists
                    const logPath = path.join(DATA_DIR, 'process_DXC_EXPENSE_001.json');
                    if (fs.existsSync(logPath)) {
                        const logData = JSON.parse(fs.readFileSync(logPath, 'utf8'));
                        const resolvedStep = {
                            id: 'step-hitl-resolved',
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            title: `✓ GL mapping confirmed by Finance: ${currentLabel}`,
                            status: newStatus === 'Done' ? 'completed' : 'warning',
                            reasoning: [
                                `Human decision received: ${signalId}`,
                                `GL account confirmed: ${currentLabel}`,
                                `Journal entry will proceed with confirmed GL mapping`,
                                `Audit trail updated with human approval timestamp`
                            ]
                        };
                        if (!logData.log) logData.log = [];
                        logData.log.push(resolvedStep);
                        logData.status = newStatus;
                        fs.writeFileSync(logPath, JSON.stringify(logData, null, 4));
                    }
                    console.log(`[HITL Resolved] DXC_EXPENSE_001 signal: ${signalId} -> status: ${newStatus}`);
                }
            } catch(e) { console.error('[Signal handler error]', e); }
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
        });
        return;
    }

    // ---- UPDATE STATUS ----
    if (cleanPath === '/api/update-status' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { id, status, currentStatus } = JSON.parse(body);
                if (fs.existsSync(PROCESSES_PATH)) {
                    const processes = JSON.parse(fs.readFileSync(PROCESSES_PATH, 'utf8'));
                    const idx = processes.findIndex(p => p.id === String(id));
                    if (idx !== -1) {
                        processes[idx].status = status;
                        processes[idx].currentStatus = currentStatus;
                        fs.writeFileSync(PROCESSES_PATH, JSON.stringify(processes, null, 4));
                    }
                }
            } catch(e) {}
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
        });
        return;
    }

    // ---- CHAT (Gemini proxy) ----
    if (cleanPath === '/api/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const parsed = JSON.parse(body);
                const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
                const MODEL = process.env.VITE_MODEL || 'gemini-2.5-flash';
                if (!GEMINI_API_KEY) {
                    // Smart demo fallback — DXC-contextual scripted responses
                    const userMsg = ((parsed.message || (parsed.messages && parsed.messages[parsed.messages.length - 1] && parsed.messages[parsed.messages.length - 1].content) || '')).toLowerCase();
                    const demoResponses = [
                        { keys: ['marsh', 'insurance', 'mclean', 'mclennan'], response: `The Marsh McLennan insurance policy is one of the high-value items in the prepaid schedule. It's a 24-month commercial liability policy at **$990,000 total**, booked to GL **110089** (Insurance Premiums), entity **DXC Technology Australia Pty Ltd**.\n\nMonthly amortization: **$41,250** — posted on the last day of each month to cost centre CC-4892. The policy was ingested via P1 (Data Ingestion) and validated against the prior-year schedule with a 2.1% YoY variance, which is within the 5% threshold.` },
                        { keys: ['microsoft', 'ea ', 'enterprise agreement', 'azure'], response: `Microsoft EA (Enterprise Agreement) is the largest single prepaid item in the current schedule. Booked to GL **110091** (Enterprise Software Licenses) at **$2,100,000** over 24 months.\n\nMonthly amortization: **$87,500** — this covers the full Microsoft 365 + Azure committed spend for DXC's APAC entities. Cost centre: CC-7234, entity: DXC Technology Pty Ltd (Australia). The contract was renewed in Q4 with a 3.2% uplift which was auto-flagged and reviewed by finance.` },
                        { keys: ['hpe', 'hewlett', 'hardware', 'maintenance'], response: `HPE hardware maintenance is tracked under GL **110095** (Hardware Maintenance Contracts). The active contract covers critical infrastructure support across 6 data centres at **$756,000 total** — amortizing at **$63,000/month** over 12 months.\n\nEntity: DXC Technology Services LLC (US). The contract was ingested in January and passed all validation checks. There's a renewal due in Q4 which will be flagged by the P1 workflow 60 days in advance.` },
                        { keys: ['gl code', 'gl account', 'general ledger', '11008', '11009'], response: `DXC uses a 6-digit GL coding scheme in the 110085–110097 range for prepaid expense bookings:\n\n• **110085** — Software & Technology Maintenance\n• **110087** — Professional Services Retainers\n• **110089** — Insurance Premiums\n• **110091** — Enterprise Software Licenses\n• **110093** — Facilities & Lease Prepayments\n• **110095** — Hardware Maintenance Contracts\n• **110097** — Telecommunications & Network\n\nEach code maps to a specific cost centre and entity. The GL mapping step in P2 validates codes against the chart of accounts before posting.` },
                        { keys: ['amortization', 'amort', 'monthly'], response: `The current amortization schedule runs straight-line across the full contract term for all active prepaid items. For example, the Marsh McLennan insurance policy (GL 110089) amortizes at **$41,250/month** over 24 months. Microsoft EA (GL 110091) runs at **$87,500/month**. All entries post to the prepaid asset account (1720000–1729999 range) with a corresponding debit to the expense account.\n\nWould you like me to pull up the full schedule or drill into a specific vendor?` },
                        { keys: ['exception', 'error', 'fail', 'issue', 'problem'], response: `The P2 (Expense Booking) workflow has built-in exception handling at three levels:\n\n1. **GL Mapping failures** — if a PO line item can't be matched to a valid GL code, the item is held and escalated to the finance team via the exception queue.\n2. **Balance mismatch** — if the amortization total doesn't reconcile to the prepaid account balance (tolerance: $0), the journal is blocked and flagged.\n3. **Missing PO reference** — items without a valid PO reference are queued for manual review.\n\nAll exceptions show up in the Exceptions panel on the right side of the dashboard with full audit trail.` },
                        { keys: ['p1', 'ingestion', 'extract', 'invoice', 'data'], response: `P1 (Prepaid Data Ingestion) handles the upstream extraction step. It pulls vendor invoices from three sources: **SAP S/4HANA** (direct GL extract), **email** (ap@dxc.com inbox), and **vendor portals** (Marsh, HPE, Microsoft).\n\nThe workflow runs 5 steps: Email monitoring → PDF extraction → Data validation → SAP reconciliation → Schedule update. OCR confidence must exceed 90% and GL totals must reconcile to $0 variance before items are passed to P2.` },
                        { keys: ['p2', 'expense booking', 'booking', 'journal'], response: `P2 (Expense Booking) is the downstream amortization and posting workflow. It picks up validated prepaid items from P1, calculates the monthly amortization amount, maps each item to the correct 6-digit GL code, and posts journal entries to SAP S/4HANA.\n\nThe workflow runs 5 steps: Load prepaid schedule → **GL Code Mapping** (the key step) → Calculate amortization → Validate journal totals → Post to SAP. All posts happen on the last day of each month.` },
                        { keys: ['how does', 'what is', 'explain', 'tell me', 'show me', 'what are'], response: `I'm Pace, your AI assistant for the DXC Account Reconciliation process. I can help you with:\n\n• **GL code lookups** — which codes apply to which vendor categories\n• **Amortization schedules** — monthly amounts, remaining terms, total values\n• **Vendor details** — Marsh McLennan, HPE, Microsoft EA, and others\n• **Exception handling** — what happens when items fail validation\n• **Process flow** — how P1 (ingestion) feeds into P2 (expense booking)\n\nWhat would you like to know?` },
                    ];
                    let reply = `I'm Pace, your AI assistant for DXC prepaid expense accounting. I can answer questions about GL codes, amortization schedules, vendor contracts, and the P1/P2 workflow.\n\nTry asking about: GL code mapping, Marsh McLennan insurance, Microsoft EA, HPE maintenance contracts, or how exceptions are handled.`;
                    for (const dr of demoResponses) {
                        if (dr.keys.some(k => userMsg.includes(k))) { reply = dr.response; break; }
                    }
                    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ response: reply }));
                    return;
                }
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: MODEL });

                let result;
                if (parsed.messages && parsed.systemPrompt) {
                    const chat = model.startChat({
                        history: parsed.messages.slice(0, -1).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
                        systemInstruction: parsed.systemPrompt
                    });
                    const last = parsed.messages[parsed.messages.length - 1];
                    result = await chat.sendMessage(last.content);
                } else {
                    const { message, knowledgeBase, history = [] } = parsed;
                    const systemPrompt = `You are a helpful assistant for DXC Account Reconciliation. Use the following knowledge base to answer questions:\n\n${knowledgeBase}`;
                    const chat = model.startChat({
                        history: history.slice(0, -1).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
                        systemInstruction: systemPrompt
                    });
                    result = await chat.sendMessage(message);
                }
                const text = result.response.text();
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ response: text }));
            } catch(e) {
                res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // ---- FEEDBACK QUESTIONS ----
    if (cleanPath === '/api/feedback/questions' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { feedback, knowledgeBase } = JSON.parse(body);
                const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
                if (!GEMINI_API_KEY) { res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' }); res.end(JSON.stringify({ questions: ['Can you clarify the context?', 'What is the expected outcome?', 'Are there any exceptions?'] })); return; }
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: process.env.VITE_MODEL || 'gemini-2.5-flash' });
                const prompt = `Based on this feedback: "${feedback}" and knowledge base context, generate exactly 3 clarifying questions. Return as JSON array of strings only.`;
                const result = await model.generateContent(prompt);
                let text = result.response.text().trim();
                if (text.startsWith('```')) text = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
                const questions = JSON.parse(text);
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ questions }));
            } catch(e) {
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ questions: ['What specific change would you like?', 'Which process does this apply to?', 'What is the business justification?'] }));
            }
        });
        return;
    }

    // ---- FEEDBACK SUMMARIZE ----
    if (cleanPath === '/api/feedback/summarize' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { feedback, questions, answers, knowledgeBase } = JSON.parse(body);
                const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
                if (!GEMINI_API_KEY) { res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' }); res.end(JSON.stringify({ summary: `Feedback received: ${feedback}` })); return; }
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: process.env.VITE_MODEL || 'gemini-2.5-flash' });
                const qaStr = questions.map((q, i) => `Q: ${q}\nA: ${answers[i] || 'No answer'}`).join('\n');
                const prompt = `Summarize this feedback into a concise actionable proposal:\nFeedback: ${feedback}\n${qaStr}\nReturn a 2-3 sentence summary.`;
                const result = await model.generateContent(prompt);
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ summary: result.response.text() }));
            } catch(e) {
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ summary: 'Feedback summarized successfully.' }));
            }
        });
        return;
    }

    // ---- FEEDBACK QUEUE (GET, POST, DELETE) ----
    if (cleanPath === '/api/feedback/queue') {
        if (req.method === 'GET') {
            const queue = readJson(FEEDBACK_QUEUE_PATH);
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ queue }));
        } else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const item = JSON.parse(body);
                    const queue = readJson(FEEDBACK_QUEUE_PATH);
                    queue.push({ ...item, status: 'pending', timestamp: new Date().toISOString() });
                    writeJson(FEEDBACK_QUEUE_PATH, queue);
                } catch(e) {}
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            });
        }
        return;
    }

    if (cleanPath.startsWith('/api/feedback/queue/') && req.method === 'DELETE') {
        const id = cleanPath.replace('/api/feedback/queue/', '');
        const queue = readJson(FEEDBACK_QUEUE_PATH);
        writeJson(FEEDBACK_QUEUE_PATH, queue.filter(item => item.id !== id));
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }

    // ---- FEEDBACK APPLY ----
    if (cleanPath === '/api/feedback/apply' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { feedbackId } = JSON.parse(body);
                const queue = readJson(FEEDBACK_QUEUE_PATH);
                const item = queue.find(i => i.id === feedbackId);
                if (!item) { res.writeHead(404, corsHeaders); res.end(JSON.stringify({ error: 'Not found' })); return; }

                const currentKB = fs.readFileSync(KB_PATH, 'utf8');
                let updatedKB = currentKB;

                const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
                if (GEMINI_API_KEY) {
                    const { GoogleGenerativeAI } = require('@google/generative-ai');
                    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
                    const model = genAI.getGenerativeModel({ model: process.env.VITE_MODEL || 'gemini-2.5-flash' });
                    const result = await model.generateContent(`Apply this feedback to the knowledge base. Return only the updated markdown content.\nFeedback: ${item.summary}\n\nCurrent KB:\n${currentKB}`);
                    updatedKB = result.response.text();
                }

                const ts = Date.now();
                const prevFile = `kb_prev_${ts}.md`;
                const snapFile = `kb_snap_${ts}.md`;
                fs.writeFileSync(path.join(SNAPSHOTS_DIR, prevFile), currentKB);
                fs.writeFileSync(path.join(SNAPSHOTS_DIR, snapFile), updatedKB);
                fs.writeFileSync(KB_PATH, updatedKB);

                const versions = readJson(KB_VERSIONS_PATH);
                versions.push({ id: String(ts), timestamp: new Date().toISOString(), snapshotFile: snapFile, previousFile: prevFile, changes: [item.summary] });
                writeJson(KB_VERSIONS_PATH, versions);

                const updatedQueue = queue.map(i => i.id === feedbackId ? { ...i, status: 'applied' } : i);
                writeJson(FEEDBACK_QUEUE_PATH, updatedQueue);

                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, content: updatedKB }));
            } catch(e) {
                res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // ---- KB CONTENT ----
    if (cleanPath === '/api/kb/content') {
        const versionId = url.searchParams.get('versionId');
        let content = '';
        if (versionId) {
            const versions = readJson(KB_VERSIONS_PATH);
            const ver = versions.find(v => v.id === versionId);
            if (ver) {
                const snapPath = path.join(SNAPSHOTS_DIR, ver.snapshotFile);
                content = fs.existsSync(snapPath) ? fs.readFileSync(snapPath, 'utf8') : '';
            }
        } else {
            content = fs.existsSync(KB_PATH) ? fs.readFileSync(KB_PATH, 'utf8') : '';
        }
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ content }));
        return;
    }

    // ---- KB VERSIONS ----
    if (cleanPath === '/api/kb/versions') {
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ versions: readJson(KB_VERSIONS_PATH) }));
        return;
    }

    // ---- KB SNAPSHOT ----
    if (cleanPath.startsWith('/api/kb/snapshot/')) {
        const filename = cleanPath.replace('/api/kb/snapshot/', '');
        const snapPath = path.join(SNAPSHOTS_DIR, filename);
        if (fs.existsSync(snapPath)) {
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'text/markdown' });
            res.end(fs.readFileSync(snapPath, 'utf8'));
        } else {
            res.writeHead(404, corsHeaders);
            res.end('Not found');
        }
        return;
    }

    // ---- DEBUG ----
    if (cleanPath === '/debug-paths') {
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ PUBLIC_DIR, DATA_DIR, exists: fs.existsSync(DATA_DIR) }));
        return;
    }

    // ---- STATIC FILES ----
    let filePath = path.join(PUBLIC_DIR, cleanPath === '/' ? 'index.html' : cleanPath);
    if (!fs.existsSync(filePath)) {
        filePath = path.join(PUBLIC_DIR, 'index.html');
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.writeHead(200, { ...corsHeaders, 'Content-Type': getMimeType(filePath) });
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.writeHead(404, corsHeaders);
        res.end('Not found');
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`DXC Prepaid Accounting demo server running on port ${PORT}`);
});

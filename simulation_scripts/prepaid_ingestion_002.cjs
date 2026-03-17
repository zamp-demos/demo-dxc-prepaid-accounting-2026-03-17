const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "DXC_PREPAID_002";
const CASE_NAME = "Insurance Premium - Marsh McLennan";

const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []);
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 4));
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const updateProcessLog = (processId, logEntry, keyDetailsUpdate = {}) => {
    const processFile = path.join(PUBLIC_DATA_DIR, `process_${processId}.json`);
    let data = { logs: [], keyDetails: {}, sidebarArtifacts: [] };
    if (fs.existsSync(processFile)) data = readJson(processFile);
    if (logEntry) {
        const existingIdx = logEntry.id ? data.logs.findIndex(l => l.id === logEntry.id) : -1;
        if (existingIdx !== -1) { data.logs[existingIdx] = { ...data.logs[existingIdx], ...logEntry }; }
        else { data.logs.push(logEntry); }
    }
    if (keyDetailsUpdate && Object.keys(keyDetailsUpdate).length > 0) {
        data.keyDetails = { ...data.keyDetails, ...keyDetailsUpdate };
    }
    writeJson(processFile, data);
};

const updateProcessListStatus = async (processId, status, currentStatus) => {
    const apiUrl = process.env.VITE_API_URL || 'http://localhost:3001';
    try {
        const response = await fetch(`${apiUrl}/api/update-status`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: processId, status, currentStatus })
        });
        if (!response.ok) throw new Error();
    } catch (e) {
        try {
            const processes = JSON.parse(fs.readFileSync(PROCESSES_FILE, 'utf8'));
            const idx = processes.findIndex(p => p.id === String(processId));
            if (idx !== -1) { processes[idx].status = status; processes[idx].currentStatus = currentStatus; fs.writeFileSync(PROCESSES_FILE, JSON.stringify(processes, null, 4)); }
        } catch (err) {}
    }
};

(async () => {
    console.log(`Starting ${PROCESS_ID}: ${CASE_NAME}...`);
    writeJson(path.join(PUBLIC_DATA_DIR, `process_${PROCESS_ID}.json`), {
        logs: [], keyDetails: { "Vendor": "Marsh McLennan", "Policy": "Global D&O + E&O", "Invoice": "MM-INV-2026-0312", "Amount": "$1,845,000" }
    });

    const steps = [
        {
            id: "step-1",
            title_p: "Ingesting insurance invoice from Marsh McLennan email attachment...",
            title_s: "Invoice PDF ingested and parsed - policy details extracted",
            reasoning: ["Email received from billing@marshmclennan.com on 2026-03-12", "Attachment: MM-INV-2026-0312.pdf (3 pages)", "OCR confidence: 97.4% - high quality scan", "Policy number: DXC-GLB-2026-001, coverage period: Jan 2026 - Dec 2026"]
        },
        {
            id: "step-2",
            title_p: "Extracting premium schedule and amortization periods...",
            title_s: "Premium schedule extracted - 12-month straight-line amortization confirmed",
            reasoning: ["Annual premium: $1,845,000 for Directors & Officers + Errors & Omissions", "Monthly amortization: $153,750", "Coverage start: January 1, 2026 | Coverage end: December 31, 2026", "Amortization method: Straight-line per DXC policy"]
        },
        {
            id: "step-3",
            title_p: "Validating against prior year policy and checking GL account mapping...",
            title_s: "Validation complete - 8.2% premium increase from prior year flagged for review",
            reasoning: ["Prior year premium (2025): $1,704,500", "Current year premium: $1,845,000 (increase: $140,500 / 8.2%)", "Threshold for auto-approval: 5% - EXCEEDS THRESHOLD", "GL mapping: Dr. Prepaid Insurance 1721000 / Cr. AP 2100000 - confirmed"],
            status_override: "warning"
        },
        {
            id: "step-4",
            title_p: "Preparing structured output for prepaid schedule entry...",
            title_s: "Output ready - pending finance review for 8.2% variance",
            reasoning: ["Invoice data structured and ready for prepaid schedule", "Flagged for finance approval due to >5% year-over-year increase", "Remaining workflow paused pending HITL review", "All 12 monthly entries pre-calculated and queued"],
            artifacts: [{ id: "art-1", type: "json", label: "Invoice Summary", data: { invoice: "MM-INV-2026-0312", vendor: "Marsh McLennan", annual_premium: "$1,845,000", monthly_amount: "$153,750", yoy_change: "+8.2%", requires_approval: "YES" } }]
        }
    ];

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const isFinal = i === steps.length - 1;
        updateProcessLog(PROCESS_ID, { id: step.id, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), title: step.title_p, status: "processing" });
        await updateProcessListStatus(PROCESS_ID, "In Progress", step.title_p);
        await delay(2500);
        const finalStatus = step.status_override || (isFinal ? "warning" : "success");
        updateProcessLog(PROCESS_ID, { id: step.id, title: step.title_s, status: finalStatus, reasoning: step.reasoning || [], artifacts: step.artifacts || [] });
        await updateProcessListStatus(PROCESS_ID, isFinal ? "Needs Attention" : "In Progress", step.title_s);
        await delay(1500);
    }
    console.log(`${PROCESS_ID} Complete`);
})();

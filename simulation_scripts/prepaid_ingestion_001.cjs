const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "DXC_PREPAID_001";
const CASE_NAME = "Accruals - Q1 2026 SAP Report";

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
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: processId, status, currentStatus })
        });
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
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
        logs: [], keyDetails: { "Report": "SAP Q1 2026 Accruals", "Entity": "DXC Technology", "Period": "Q1 2026", "Source": "SAP S/4HANA" }
    });

    const steps = [
        {
            id: "step-1",
            title_p: "Connecting to SAP S/4HANA and pulling Q1 accruals report...",
            title_s: "SAP data pull complete - 847 line items retrieved",
            reasoning: ["Connected to SAP S/4HANA via RFC connector", "Queried T-code FBL3N for accrual accounts", "Retrieved 847 line items across 12 cost centers", "Export format: CSV with GL codes and cost allocations"]
        },
        {
            id: "step-2",
            title_p: "Parsing and classifying prepaid expense categories...",
            title_s: "Classification complete - 312 prepaid items identified",
            reasoning: ["Filtered items by account range 1720000-1729999 (Prepaid accounts)", "Classified into: Insurance (124), Software licenses (98), Maintenance contracts (90)", "Identified 312 active prepaid items with remaining balances", "Cross-referenced with vendor master for validation"]
        },
        {
            id: "step-3",
            title_p: "Extracting invoice references and matching to prepaid schedule...",
            title_s: "Invoice matching complete - 298/312 matched, 14 exceptions flagged",
            reasoning: ["Matched 298 items to existing prepaid schedule entries", "14 items flagged: 8 new invoices not yet in schedule, 6 amount variances detected", "Average match confidence: 94.2%", "Exception items queued for manual review"]
        },
        {
            id: "step-4",
            title_p: "Generating structured extraction output and validating totals...",
            title_s: "Extraction complete - $4.2M prepaid balance validated",
            reasoning: ["Total prepaid balance: $4,218,445.32", "Reconciled against GL balance: $4,218,445.32 - MATCH", "14 exception items excluded from automated processing", "Output file ready for Expense Booking workflow"],
            artifacts: [{ id: "art-1", type: "json", label: "Extraction Summary", data: { total_items: 312, matched: 298, exceptions: 14, total_balance: "$4,218,445.32", gl_match: "YES", period: "Q1 2026" } }]
        }
    ];

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const isFinal = i === steps.length - 1;
        updateProcessLog(PROCESS_ID, { id: step.id, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), title: step.title_p, status: "processing" });
        await updateProcessListStatus(PROCESS_ID, "In Progress", step.title_p);
        await delay(2500);
        updateProcessLog(PROCESS_ID, { id: step.id, title: step.title_s, status: isFinal ? "completed" : "success", reasoning: step.reasoning || [], artifacts: step.artifacts || [] });
        await updateProcessListStatus(PROCESS_ID, isFinal ? "Done" : "In Progress", step.title_s);
        await delay(1500);
    }
    console.log(`${PROCESS_ID} Complete`);
})();

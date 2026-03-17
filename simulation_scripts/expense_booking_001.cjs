const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "DXC_EXPENSE_001";
const CASE_NAME = "Software License Amortization - Q1";

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
        logs: [], keyDetails: { "Vendor": "Microsoft EA", "Contract": "EA-DXC-2024-001", "Q1 Expense": "$312,500", "GL Account": "7410000" }
    });

    const steps = [
        {
            id: "step-1",
            title_p: "Loading prepaid software license schedule from ingestion output...",
            title_s: "Schedule loaded - 98 software license entries ready for Q1 booking",
            reasoning: ["Loaded prepaid schedule from Data Ingestion workflow output", "98 software license entries with active balances", "Q1 2026 amortization period: Jan 1 - Mar 31, 2026", "Microsoft EA represents largest single entry: $312,500/quarter"]
        },
        {
            id: "step-2",
            title_p: "Calculating Q1 amortization amounts per license category...",
            title_s: "Amortization calculated - $2,187,500 total Q1 software expense",
            reasoning: ["Microsoft EA (365, Azure, Dynamics): $312,500", "Oracle Database licenses: $187,500", "Salesforce CRM enterprise: $95,000", "Other software (46 vendors): $1,592,500", "Total Q1 software amortization: $2,187,500"]
        },
        {
            id: "step-3",
            title_p: "Preparing journal entry with cost center allocations...",
            title_s: "Journal entry prepared - 312 debit lines across 28 cost centers",
            reasoning: ["Debit: IT Expense GL 7410000 across 28 cost centers", "Credit: Prepaid Software GL 1724000 - single offset entry", "Cost center allocation based on employee headcount per center", "Journal entry reference: JE-2026-Q1-SW-001"]
        },
        {
            id: "step-4",
            title_p: "Posting journal entry to SAP and generating confirmation...",
            title_s: "Journal entry posted successfully - SAP document 1900045821",
            reasoning: ["Posted to SAP S/4HANA company code 1000", "SAP document number: 1900045821", "Posting date: March 31, 2026", "All 312 line items posted without errors", "Prepaid balance reduced by $2,187,500"],
            artifacts: [{ id: "art-1", type: "json", label: "Journal Entry Summary", data: { sap_doc: "1900045821", posting_date: "2026-03-31", total_expense: "$2,187,500", cost_centers: 28, line_items: 312, status: "POSTED" } }]
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

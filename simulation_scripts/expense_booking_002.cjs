const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "DXC_EXPENSE_002";
const CASE_NAME = "Maintenance Contract - HPE";

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
        logs: [], keyDetails: { "Vendor": "HPE", "Contract": "HPE-MTC-2025-DXC", "Monthly": "$87,500", "GL Account": "7420000" }
    });

    const steps = [
        {
            id: "step-1",
            title_p: "Retrieving HPE maintenance contract from prepaid schedule...",
            title_s: "HPE contract retrieved - 3-year maintenance agreement, Year 1 of 3",
            reasoning: ["Contract HPE-MTC-2025-DXC: ProLiant server maintenance", "Contract period: April 2025 - March 2028 (36 months)", "Total contract value: $3,150,000", "Q1 2026 is Month 9 of 36"]
        },
        {
            id: "step-2",
            title_p: "Calculating monthly expense booking amount...",
            title_s: "Expense amount confirmed - $87,500/month straight-line",
            reasoning: ["Monthly amount: $3,150,000 / 36 months = $87,500", "Q1 2026 total: $87,500 x 3 months = $262,500", "Remaining prepaid balance after Q1: $2,537,500", "Cost center: IT Infrastructure (CC-8801)"]
        },
        {
            id: "step-3",
            title_p: "Creating SAP journal entry for Q1 maintenance expense...",
            title_s: "Journal entry created and validated - ready for posting",
            reasoning: ["Dr. Maintenance Expense GL 7420000: $262,500", "Cr. Prepaid Maintenance GL 1725000: $262,500", "Cost center CC-8801 (IT Infrastructure)", "Journal entry validated against budget: within approved limit"]
        },
        {
            id: "step-4",
            title_p: "Posting to SAP and updating prepaid schedule balance...",
            title_s: "Q1 expense booked - SAP document 1900045834, balance updated",
            reasoning: ["SAP document 1900045834 posted successfully", "Posting date: March 31, 2026", "Prepaid balance updated: $2,537,500 remaining (29 months)", "Next booking: April 30, 2026 - $87,500"],
            artifacts: [{ id: "art-1", type: "json", label: "Booking Summary", data: { sap_doc: "1900045834", vendor: "HPE", q1_expense: "$262,500", monthly_rate: "$87,500", remaining_balance: "$2,537,500", months_remaining: 29 } }]
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

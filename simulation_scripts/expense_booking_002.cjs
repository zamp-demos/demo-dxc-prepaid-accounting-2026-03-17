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
        logs: [], keyDetails: {
            "Vendor": "Hewlett Packard Enterprise",
            "Contract": "HPE-MTC-2026-022",
            "Monthly Amortization": "$41,666.67",
            "GL Code": "110094",
            "Prepaid Account": "Prepaid - ITSM Software"
        }
    });

    const steps = [
        {
            id: "step-1",
            title_p: "Retrieving HPE maintenance contract from prepaid schedule...",
            title_s: "HPE contract retrieved — 3-year maintenance agreement, Year 1 of 3",
            reasoning: [
                "Contract HPE-MTC-2026-022: HPE Pointnext Datacenter Support & Maintenance",
                "Contract period: April 2026 – March 2029 (36 months)",
                "Total contract value: $1,500,000",
                "Monthly straight-line amortization: $41,666.67"
            ]
        },
        {
            id: "step-2",
            title_p: "Reading PO line item details and business justification for GL mapping...",
            title_s: "GL code 110094 identified — Prepaid - ITSM Software",
            reasoning: [
                "PO Line Item Name: 'HPE Pointnext — Datacenter Support & Maintenance Services'",
                "PO Line Description: Annual datacenter hardware maintenance and support subscription covering HPE ProLiant servers, storage arrays, and networking equipment at DXC co-location sites; PO HPE-MTC-2026-022",
                "Business Justification: Hardware maintenance contract billed annually in Q1; support services consumed evenly across 12-month term; prepaid recognition applied per DXC policy > $25K threshold",
                "Expense category matched: hardware support & managed services → GL cluster 110094",
                "GL 110094 description: Prepaid expenses — IT service management and operations platform subscriptions",
                "(G) GL code 110094 (Prepaid - ITSM Software) confirmed — straight-line amortization applies"
            ]
        },
        {
            id: "step-3",
            title_p: "Calculating monthly expense booking amount...",
            title_s: "Expense amount confirmed — $41,666.67/month straight-line",
            reasoning: [
                "Monthly amount: $1,500,000 ÷ 36 months = $41,666.67",
                "Q1 2026 total (Jan–Mar): $125,000.01",
                "Remaining prepaid balance after Q1: $1,374,999.99 (33 months)",
                "Cost center: IT Infrastructure (CC-8801)"
            ]
        },
        {
            id: "step-4",
            title_p: "Preparing journal entry — GL 110094 credit, maintenance expense debit...",
            title_s: "Journal entry created and validated — ready for posting",
            reasoning: [
                "Dr. Maintenance & Support Expense GL 7420000: $41,666.67",
                "Cr. Prepaid Maintenance GL 110094: $41,666.67",
                "Cost center CC-8801 (IT Infrastructure)",
                "Journal entry reference: JE-2026-HPE-MTC-001",
                "Validated against budget: within approved IT ops envelope"
            ]
        },
        {
            id: "step-5",
            title_p: "Posting to SAP and updating prepaid schedule balance...",
            title_s: "Expense booked — SAP document 1900045834, GL 110094 balance updated",
            reasoning: [
                "SAP document 1900045834 posted successfully",
                "Posting date: March 31, 2026",
                "GL 110094 (Prepaid - ITSM Software) balance reduced by $41,666.67",
                "Remaining prepaid balance: $1,374,999.99 (33 months remaining)",
                "(G) Next booking scheduled: April 30, 2026 — $41,666.67"
            ],
            artifacts: [{
                id: "art-gl-mapping",
                type: "json",
                label: "GL Mapping Summary",
                data: {
                    gl_code: "110094",
                    gl_account_name: "Prepaid - ITSM Software",
                    po_line_name: "HPE Pointnext — Datacenter Support & Maintenance Services",
                    business_justification: "Hardware maintenance billed annually; benefit accrues evenly over 36-month contract",
                    monthly_amortization: "$41,666.67",
                    sap_document: "1900045834",
                    posting_date: "2026-03-31",
                    status: "POSTED"
                }
            }]
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

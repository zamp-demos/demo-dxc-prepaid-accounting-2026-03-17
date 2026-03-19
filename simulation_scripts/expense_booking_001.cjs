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
        logs: [], keyDetails: {
            "Vendor": "Microsoft EA",
            "Contract": "EA-DXC-2026-001",
            "Monthly Amortization": "$729,166.67",
            "GL Code": "110092",
            "Prepaid Account": "Prepaid - CRM Software"
        }
    });

    const steps = [
        {
            id: "step-1",
            title_p: "Loading prepaid software license schedule from ingestion output...",
            title_s: "Schedule loaded — 98 software license entries ready for Q1 booking",
            reasoning: [
                "Loaded prepaid schedule from Data Ingestion workflow output",
                "98 software license entries with active balances across 14 vendors",
                "Q1 2026 amortization period: Jan 1 – Mar 31, 2026",
                "Microsoft EA represents largest single entry: $729,166.67/month"
            ]
        },
        {
            id: "step-2",
            title_p: "Reading PO line item details and business justification for GL mapping...",
            title_s: "GL mapping ambiguous — Pace needs your input to proceed",
            status_override: "warning",
            reasoning: [
                "PO Line Item: 'Microsoft EA — Azure + M365 Software Licenses'",
                "PO Description: Annual enterprise agreement covering Azure committed spend and Microsoft 365 E5 licenses for DXC global workforce; SKU MS-EA-2026-DXC",
                "Business Justification: Enterprise cloud and productivity software billed annually upfront",
                "Problem: 'Azure + M365' spans two GL clusters — cloud infrastructure (110091) AND productivity/CRM software (110092)",
                "110091 — Prepaid Enterprise Software Licenses: covers SaaS platforms, ERP, collaboration tools",
                "110092 — Prepaid CRM & Business Intelligence Software: covers sales, analytics, BI tooling",
                "Microsoft 365 E5 includes both Teams/Exchange (productivity → 110091) and Power BI Premium (BI → 110092)",
                "Azure committed spend is infrastructure, not software license — could also map to 110093 (Prepaid IT Infrastructure)",
                "Confidence score: 54% — below the 80% threshold required for automated posting",
                "Pace is pausing and escalating to human reviewer before proceeding"
            ],
            artifacts: [
                {
                    id: "dec-gl-mapping-001",
                    type: "decision",
                    label: "Review GL mapping",
                    data: {
                        question: "Pace cannot confidently determine the correct GL code for 'Microsoft EA — Azure + M365 Software Licenses'. The PO spans cloud infrastructure and productivity SaaS, which map to different GL clusters. Please select the correct account:",
                        options: [
                            { value: "opt-110091", label: "GL 110091 — Prepaid Enterprise Software Licenses (M365 E5 as primary, Azure as bundled SaaS)", signal: "gl_confirm_110091" },
                            { value: "opt-110092", label: "GL 110092 — Prepaid CRM & Business Intelligence Software (Power BI Premium, analytics focus)", signal: "gl_confirm_110092" },
                            { value: "opt-split", label: "Split across accounts — 70% GL 110091 (M365), 30% GL 110093 (Azure infrastructure)", signal: "gl_confirm_split" },
                            { value: "opt-escalate", label: "Escalate to Finance Controller — hold this entry pending manual review", signal: "gl_escalate_finance" }
                        ]
                    }
                }
            ],
            hitl: true
        },
        {
            id: "step-3",
            title_p: "Calculating monthly amortization amounts per license category...",
            title_s: "Amortization calculated — $729,166.67/month for Microsoft EA",
            reasoning: [
                "Contract total value: $8,750,000 (12-month EA)",
                "Monthly amortization: $8,750,000 ÷ 12 = $729,166.67",
                "Q1 2026 total (Jan–Mar): $2,187,500.00",
                "Prepaid balance remaining after Q1: $6,562,500.00 (9 months)",
                "All amounts validated against PO EA-DXC-2026-001"
            ]
        },
        {
            id: "step-4",
            title_p: "Preparing journal entry with GL 110092 debit and cost center allocations...",
            title_s: "Journal entry prepared — 28 cost centers, GL 110092 → GL 7410000",
            reasoning: [
                "Dr. IT & Software Expense GL 7410000 across 28 cost centers: $729,166.67",
                "Cr. Prepaid Software GL 110092: $729,166.67",
                "Cost center allocation based on licensed user headcount per center",
                "Journal entry reference: JE-2026-Q1-MS-EA-001",
                "Validated against approved budget: within Q1 software expense envelope"
            ]
        },
        {
            id: "step-5",
            title_p: "Posting journal entry to SAP and generating confirmation...",
            title_s: "Journal entry posted — SAP document 1900045821, GL 110092 balance updated",
            reasoning: [
                "Posted to SAP S/4HANA company code 1000",
                "SAP document number: 1900045821",
                "Posting date: March 31, 2026",
                "GL 110092 (Prepaid - CRM Software) balance reduced by $729,166.67",
                "(G) All 28 line items posted without errors"
            ],
            artifacts: [{
                id: "art-gl-mapping",
                type: "json",
                label: "GL Mapping Summary",
                data: {
                    gl_code: "110092",
                    gl_account_name: "Prepaid - CRM Software",
                    po_line_name: "Microsoft EA — Azure + M365 Software Licenses",
                    business_justification: "Annual upfront SaaS; benefit accrues evenly over 12 months",
                    monthly_amortization: "$729,166.67",
                    sap_document: "1900045821",
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

        // HITL step — pause and surface decision to human before continuing
        if (step.hitl) {
            const finalStatus = step.status_override || "warning";
            updateProcessLog(PROCESS_ID, { id: step.id, title: step.title_s, status: finalStatus, reasoning: step.reasoning || [], artifacts: step.artifacts || [] });
            await updateProcessListStatus(PROCESS_ID, "Needs Attention", step.title_s);
            console.log(`[HITL] Paused at step ${step.id} — waiting for human decision`);
            break; // Stop simulation here; remaining steps run after signal received
        }

        updateProcessLog(PROCESS_ID, { id: step.id, title: step.title_s, status: isFinal ? "completed" : "success", reasoning: step.reasoning || [], artifacts: step.artifacts || [] });
        await updateProcessListStatus(PROCESS_ID, isFinal ? "Done" : "In Progress", step.title_s);
        await delay(1500);
    }
    console.log(`${PROCESS_ID} Complete`);
})();

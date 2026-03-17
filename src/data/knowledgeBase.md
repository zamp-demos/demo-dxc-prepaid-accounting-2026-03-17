# DXC Account Reconciliation - Prepaid Expense Accounting

## Overview

DXC Technology's prepaid expense accounting process covers the end-to-end workflow for managing prepaid assets from invoice ingestion through monthly expense amortization. This knowledge base documents the standards, policies, and procedures for the two core processes.

---

## Process 1: Prepaid - Data Ingestion & Invoice Extraction

### Purpose
Automate the extraction and classification of prepaid expense data from multiple source systems (SAP S/4HANA, email invoices, vendor portals) and prepare structured data for the expense booking workflow.

### Source Systems
- **SAP S/4HANA**: Primary GL system for accruals and prepaid account balances
- **Email**: Vendor invoices received at ap@dxc.com
- **Vendor Portals**: Marsh McLennan, HPE, Microsoft EA portals

### GL Account Range
Prepaid accounts at DXC: **1720000 - 1729999**
- 1721000: Prepaid Insurance
- 1722000: Prepaid Rent
- 1723000: Prepaid Maintenance
- 1724000: Prepaid Software Licenses
- 1725000: Prepaid Maintenance Contracts
- 1726000: Prepaid Subscriptions

### Validation Rules
1. **GL Balance Match**: Extracted totals must reconcile to GL balance (tolerance: $0)
2. **Invoice Matching**: Minimum 90% of items must match existing prepaid schedule
3. **YoY Variance Threshold**: Flag invoices with >5% year-over-year premium increase for finance review
4. **OCR Confidence**: Minimum 90% confidence required for automated processing

---

## Process 2: Prepaid - Expense Booking

### Purpose
Calculate and post monthly amortization journal entries for all active prepaid items to SAP S/4HANA.

### Amortization Methods
- **Straight-Line**: Default method for all prepaid items unless otherwise specified
- **Usage-Based**: Applied only to software licenses with metered usage (requires separate approval)

### Journal Entry Standards
- **Debit**: Expense account (7xxx range) with cost center allocation
- **Credit**: Corresponding prepaid asset account (172xxxx)
- **Posting Date**: Last day of each month
- **Period**: Current fiscal month

### Cost Center Allocation
Software and IT-related prepaid items are allocated based on headcount per cost center, updated quarterly. Finance reviews allocations annually.

### SAP Posting
- Company code: **1000** (DXC Technology US)
- Document type: **SA** (G/L Account Document)
- Minimum approvals required for entries >$500,000

---

## Approval Matrix

| Amount | Required Approval |
|--------|------------------|
| < $100,000 | Automated - no approval needed |
| $100K - $500K | Senior Accountant review |
| > $500K | Finance Controller sign-off |
| YoY increase >5% | Finance Manager review regardless of amount |

---

## Common Exception Scenarios

1. **New vendor invoice not in prepaid schedule**: Route to AP team for PO matching before adding to schedule
2. **Amount variance on renewal**: Flag for finance review if >5% from prior period
3. **Expired prepaid balance**: Auto-write-off if balance < $100 and contract expired
4. **Missing cost center**: Default to corporate overhead CC-9900 with notification to cost center owner


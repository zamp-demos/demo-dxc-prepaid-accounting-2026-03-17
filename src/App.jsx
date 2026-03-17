import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import ProcessList from './components/ProcessList';
import ProcessDetails from './components/ProcessDetails';
import KnowledgeBase from './components/KnowledgeBase';
import PeoplePage from './components/People';
import Login from './components/Login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/done" element={<DashboardLayout />}>
          <Route index element={<Navigate to="prepaid-data-ingestion" replace />} />
          <Route path="prepaid-data-ingestion" element={
            <ProcessList key="prepaid-data-ingestion" title="Prepaid - Data Ingestion & Invoice Extraction" category="Prepaid - Data Ingestion & Invoice Extraction" />
          } />
          <Route path="prepaid-expense-booking" element={
            <ProcessList key="prepaid-expense-booking" title="Prepaid - Expense Booking" category="Prepaid - Expense Booking" />
          } />
          <Route path="knowledge-base" element={<KnowledgeBase />} />
          <Route path="people" element={<PeoplePage />} />
          <Route path="process/:id" element={<ProcessDetails />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

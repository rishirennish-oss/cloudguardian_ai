import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import ServerDetailPage from './pages/ServerDetailPage';
import AlertsPage from './pages/AlertsPage';
import RecoveriesPage from './pages/RecoveriesPage';
import SimulatePage from './pages/SimulatePage';
import { StatusProvider } from './context/StatusContext';

export default function App() {
  return (
    <StatusProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="servers/:serverId" element={<ServerDetailPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="recoveries" element={<RecoveriesPage />} />
          <Route path="simulate" element={<SimulatePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </StatusProvider>
  );
}


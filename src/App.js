import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Header from './components/Header';
import Welcome from './pages/Welcome';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import './App.css';

function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Outlet />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/initiative/:id" element={<Workspace />} />
          </Route>
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;

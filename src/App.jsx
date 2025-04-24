// src/App.jsx
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Login from './components/Login';
import PatientDashboard from './components/dashboards/PatientDashboard';
import DoctorDashboard from './components/dashboards/DoctorDashboard';
import InsuranceDashboard from './components/dashboards/InsuranceDashboard';
import './App.css';

function App() {
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user was previously connected
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();

          if (accounts.length > 0) {
            const signer = await provider.getSigner();
            const address = accounts[0];

            // Create contract instance to check role
            const contractABI = [
              "function getUserRole(address _user) view returns (uint8)",
              "function isRegistered(address _user) view returns (bool)"
            ];
            const contractAddress = "0x55A28270D65b0cEC232249e2422F548e0d9e521D";
            const contract = new ethers.Contract(contractAddress, contractABI, provider);

            // Check if user is registered
            const isRegistered = await contract.isRegistered(address);

            if (isRegistered) {
              // Get user role
              const roleId = await contract.getUserRole(address);
              let role = 'unknown';

              switch (Number(roleId)) {
                case 1: role = 'patient'; break;
                case 2: role = 'doctor'; break;
                case 3: role = 'insurance-provider'; break;
                default: role = 'unknown';
              }

              setWalletData({
                address,
                provider,
                signer,
                role
              });
            }
          }
        } catch (error) {
          console.error("Error checking connection:", error);
        }
      }
      setLoading(false);
    };

    checkConnection();
  }, []);

  const handleLogin = (data) => {
    setWalletData(data);
  };

  const handleLogout = () => {
    setWalletData(null);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  // Render the appropriate dashboard based on user role
  const renderDashboard = () => {
    if (!walletData) return null;

    switch (walletData.role) {
      case 'patient':
        return <PatientDashboard walletData={walletData} onLogout={handleLogout} />;
      case 'doctor':
        return <DoctorDashboard walletData={walletData} onLogout={handleLogout} />;
      case 'insurance-provider':
        return <InsuranceDashboard walletData={walletData} onLogout={handleLogout} />;
      default:
        return <div>Unknown role. Please contact support.</div>;
    }
  };

  return (
    <div className="app">
      {walletData ? (
        renderDashboard()
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;

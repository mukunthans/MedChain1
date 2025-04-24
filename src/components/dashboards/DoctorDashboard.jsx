import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

function DoctorDashboard({ walletData, onLogout }) {
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const balanceInWei = await walletData.provider.getBalance(walletData.address);
                // Use formatEther directly from ethers in v6
                setBalance(ethers.formatEther(balanceInWei));
            } catch (error) {
                console.error("Error fetching balance:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBalance();
    }, [walletData]);

    // Format address for display
    const formatAddress = (address) => {
        if (!address) return '';
        const addressStr = String(address);
        return `${addressStr.substring(0, 6)}...${addressStr.substring(addressStr.length - 4)}`;
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Doctor Dashboard</h1>
                <div className="user-info">
                    <span>Role: Doctor</span>
                    <span>Address: {formatAddress(walletData.address)}</span>
                    <button className="logout-button" onClick={onLogout}>Disconnect</button>
                </div>
            </header>

            <div className="dashboard-content">
                <div className="account-info">
                    <h2>Account Information</h2>
                    <div className="info-card">
                        <p><strong>Wallet Address:</strong> {String(walletData.address)}</p>
                        <p><strong>Network:</strong> Hedera Testnet</p>
                        <p>
                            <strong>Balance:</strong>
                            {loading ? 'Loading...' : `${balance} HBAR`}
                        </p>
                    </div>
                </div>

                <div className="card">
                    <h2>Patient Records</h2>
                    <p>Access patient medical records</p>
                    <button>View Patients</button>
                </div>

                <div className="card">
                    <h2>Update Records</h2>
                    <p>Update patient medical information</p>
                    <button>Update Records</button>
                </div>

                <div className="card">
                    <h2>Prescriptions</h2>
                    <p>Manage patient prescriptions</p>
                    <button>Manage Prescriptions</button>
                </div>
            </div>
        </div>
    );
}

export default DoctorDashboard;

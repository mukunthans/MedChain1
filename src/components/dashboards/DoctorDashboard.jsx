// src/components/dashboards/DoctorDashboard.jsx
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

function DoctorDashboard({ walletData, onLogout }) {
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [patientRecords, setPatientRecords] = useState([]);

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const balanceInWei = await walletData.provider.getBalance(walletData.address);
                setBalance(ethers.formatEther(balanceInWei));
            } catch (error) {
                console.error("Error fetching balance:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBalance();
        loadAuthorizedPatients();
    }, [walletData]);

    // Format address for display
    const formatAddress = (address) => {
        if (!address) return '';
        const addressStr = String(address);
        return `${addressStr.substring(0, 6)}...${addressStr.substring(addressStr.length - 4)}`;
    };

    const loadAuthorizedPatients = () => {
        // In a real application, this would query the blockchain
        // For now, we'll check localStorage for all patients who authorized this doctor
        const allPatients = [];

        // This is inefficient but works for demo purposes
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('authorized_doctors_')) {
                const patientAddress = key.replace('authorized_doctors_', '');
                const doctors = JSON.parse(localStorage.getItem(key) || '[]');

                if (doctors.some(doc => doc.address === walletData.address)) {
                    allPatients.push({
                        address: patientAddress,
                        authorizedDate: doctors.find(doc => doc.address === walletData.address).authorizedDate
                    });
                }
            }
        }

        setPatients(allPatients);
    };

    const viewPatientRecords = (patientAddress) => {
        setSelectedPatient(patientAddress);

        // Load patient records
        const records = JSON.parse(localStorage.getItem(`patient_records_${patientAddress}`) || '[]');
        setPatientRecords(records);
    };

    const viewRecord = async (record) => {
        // In a real application, this would:
        // 1. Fetch the encrypted file from IPFS using the CID
        // 2. Decrypt it using the encryption key (after decrypting the key with doctor's private key)
        // 3. Display or download the file

        alert(`In a production app, this would decrypt and display the record: ${record.cid}`);
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
                    <h2>Authorized Patients</h2>
                    {patients.length === 0 ? (
                        <p>No patients have authorized you yet</p>
                    ) : (
                        <ul className="patients-list">
                            {patients.map(patient => (
                                <li key={patient.address} className="patient-item">
                                    <div className="patient-info">
                                        <p>Address: {patient.address}</p>
                                        <p>Authorized since: {new Date(patient.authorizedDate).toLocaleDateString()}</p>
                                    </div>
                                    <button
                                        onClick={() => viewPatientRecords(patient.address)}
                                        className="view-records-button"
                                    >
                                        View Records
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {selectedPatient && (
                    <div className="card">
                        <h2>Patient Records</h2>
                        <p>Viewing records for patient: {selectedPatient}</p>

                        {patientRecords.length === 0 ? (
                            <p>No records available</p>
                        ) : (
                            <ul className="records-list">
                                {patientRecords.map(record => (
                                    <li key={record.id} className="record-item">
                                        <div className="record-info">
                                            <strong>{record.metadata.name}</strong>
                                            <p>{record.metadata.description}</p>
                                            <p>Uploaded: {new Date(record.metadata.uploadDate).toLocaleDateString()}</p>
                                        </div>
                                        <button
                                            onClick={() => viewRecord(record)}
                                            className="view-button"
                                        >
                                            View Record
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default DoctorDashboard;

// src/components/dashboards/PatientDashboard.jsx
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { create } from 'ipfs-http-client';
import { Buffer } from 'buffer';

if (!window.Buffer) {
    window.Buffer = Buffer;
}

// Configure IPFS client with Infura (you'll need to create an account)
const projectId = 'YOUR_INFURA_PROJECT_ID';
const projectSecret = 'YOUR_INFURA_PROJECT_SECRET';
const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

const ipfsClient = create({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
        authorization: auth
    }
});

function PatientDashboard({ walletData, onLogout }) {
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [fileDescription, setFileDescription] = useState('');
    const [uploadStatus, setUploadStatus] = useState('');
    const [myRecords, setMyRecords] = useState([]);
    const [authorizedDoctors, setAuthorizedDoctors] = useState([]);
    const [doctorAddress, setDoctorAddress] = useState('');

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
        loadMyRecords();
        loadAuthorizedDoctors();
    }, [walletData]);

    // Format address for display
    const formatAddress = (address) => {
        if (!address) return '';
        const addressStr = String(address);
        return `${addressStr.substring(0, 6)}...${addressStr.substring(addressStr.length - 4)}`;
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setFileName(selectedFile.name);
        }
    };

    const uploadToIPFS = async () => {
        if (!file) {
            setUploadStatus('Please select a file first');
            return;
        }

        try {
            setUploadStatus('Encrypting and uploading to IPFS...');

            // Read the file
            const fileData = await file.arrayBuffer();
            const fileBuffer = Buffer.from(fileData);

            // Generate a random encryption key
            const encryptionKey = ethers.randomBytes(32);

            // Encrypt the file (simplified - in production use a proper encryption library)
            // This is a placeholder - you should implement proper AES encryption
            const encryptedBuffer = encryptFile(fileBuffer, encryptionKey);

            // Upload encrypted file to IPFS
            const result = await ipfsClient.add(encryptedBuffer);
            const ipfsCid = result.path;

            // Create metadata including encryption key (encrypted with patient's public key)
            const metadata = {
                name: fileName,
                description: fileDescription,
                type: file.type,
                size: file.size,
                uploadDate: new Date().toISOString(),
                patientAddress: walletData.address,
                encryptionKey: encryptionKey.toString('hex') // In production, encrypt this
            };

            // Store metadata in localStorage (in production, use a secure database or blockchain)
            const records = JSON.parse(localStorage.getItem(`patient_records_${walletData.address}`) || '[]');
            records.push({
                id: Date.now(),
                cid: ipfsCid,
                metadata: metadata
            });
            localStorage.setItem(`patient_records_${walletData.address}`, JSON.stringify(records));

            setUploadStatus('File uploaded successfully!');
            setFile(null);
            setFileName('');
            setFileDescription('');

            // Reload records
            loadMyRecords();

        } catch (error) {
            console.error("Error uploading file:", error);
            setUploadStatus('Error uploading file: ' + error.message);
        }
    };

    // Placeholder encryption function - replace with actual encryption
    const encryptFile = (buffer, key) => {
        // In a real application, implement AES encryption here
        // This is just a placeholder
        return buffer;
    };

    const loadMyRecords = () => {
        const records = JSON.parse(localStorage.getItem(`patient_records_${walletData.address}`) || '[]');
        setMyRecords(records);
    };

    const loadAuthorizedDoctors = () => {
        const doctors = JSON.parse(localStorage.getItem(`authorized_doctors_${walletData.address}`) || '[]');
        setAuthorizedDoctors(doctors);
    };

    const authorizeDoctor = () => {
        if (!doctorAddress) {
            return;
        }

        const doctors = JSON.parse(localStorage.getItem(`authorized_doctors_${walletData.address}`) || '[]');

        // Check if doctor is already authorized
        if (!doctors.some(doc => doc.address === doctorAddress)) {
            doctors.push({
                address: doctorAddress,
                authorizedDate: new Date().toISOString()
            });

            localStorage.setItem(`authorized_doctors_${walletData.address}`, JSON.stringify(doctors));
            setDoctorAddress('');
            loadAuthorizedDoctors();
        }
    };

    const revokeAccess = (doctorAddress) => {
        const doctors = JSON.parse(localStorage.getItem(`authorized_doctors_${walletData.address}`) || '[]');
        const updatedDoctors = doctors.filter(doc => doc.address !== doctorAddress);
        localStorage.setItem(`authorized_doctors_${walletData.address}`, JSON.stringify(updatedDoctors));
        loadAuthorizedDoctors();
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Patient Dashboard</h1>
                <div className="user-info">
                    <span>Role: Patient</span>
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
                    <h2>Upload Medical Record</h2>
                    <div className="upload-form">
                        <input
                            type="file"
                            onChange={handleFileChange}
                            className="file-input"
                        />
                        <input
                            type="text"
                            placeholder="File description"
                            value={fileDescription}
                            onChange={(e) => setFileDescription(e.target.value)}
                            className="text-input"
                        />
                        <button
                            onClick={uploadToIPFS}
                            disabled={!file}
                            className="upload-button"
                        >
                            Upload Record
                        </button>
                        {uploadStatus && <p className="status-message">{uploadStatus}</p>}
                    </div>
                </div>

                <div className="card">
                    <h2>My Medical Records</h2>
                    {myRecords.length === 0 ? (
                        <p>No records found</p>
                    ) : (
                        <ul className="records-list">
                            {myRecords.map(record => (
                                <li key={record.id} className="record-item">
                                    <div className="record-info">
                                        <strong>{record.metadata.name}</strong>
                                        <p>{record.metadata.description}</p>
                                        <p>Uploaded: {new Date(record.metadata.uploadDate).toLocaleDateString()}</p>
                                        <p>IPFS CID: {record.cid}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="card">
                    <h2>Doctor Access</h2>
                    <div className="doctor-form">
                        <input
                            type="text"
                            placeholder="Doctor's wallet address"
                            value={doctorAddress}
                            onChange={(e) => setDoctorAddress(e.target.value)}
                            className="text-input"
                        />
                        <button
                            onClick={authorizeDoctor}
                            disabled={!doctorAddress}
                            className="authorize-button"
                        >
                            Authorize Doctor
                        </button>
                    </div>

                    <h3>Authorized Doctors</h3>
                    {authorizedDoctors.length === 0 ? (
                        <p>No doctors authorized</p>
                    ) : (
                        <ul className="doctors-list">
                            {authorizedDoctors.map(doctor => (
                                <li key={doctor.address} className="doctor-item">
                                    <div className="doctor-info">
                                        <p>Address: {doctor.address}</p>
                                        <p>Authorized: {new Date(doctor.authorizedDate).toLocaleDateString()}</p>
                                    </div>
                                    <button
                                        onClick={() => revokeAccess(doctor.address)}
                                        className="revoke-button"
                                    >
                                        Revoke Access
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PatientDashboard;

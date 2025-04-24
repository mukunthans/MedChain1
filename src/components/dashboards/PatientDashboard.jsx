// src/components/dashboards/PatientDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { Buffer } from 'buffer';
import CryptoJS from 'crypto-js'; // Add this dependency with: npm install crypto-js

if (!window.Buffer) {
    window.Buffer = Buffer;
}

// Pinata API keys (replace with your actual keys)
const PINATA_API_KEY = 'f1efd88c2b40778ca26e';
const PINATA_API_SECRET = '3921f9501ca6abef2b071bf0725456d09033accee84445f731f106cbe135b21c';

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
            const encryptionKey = CryptoJS.lib.WordArray.random(16).toString();

            // Encrypt the file using CryptoJS
            const encryptedData = CryptoJS.AES.encrypt(
                Buffer.from(fileBuffer).toString('base64'),
                encryptionKey
            ).toString();

            // Create a Blob from the encrypted data
            const encryptedBlob = new Blob([encryptedData], { type: 'application/encrypted' });

            // Create form data for Pinata
            const formData = new FormData();
            formData.append('file', new File([encryptedBlob], fileName, { type: 'application/encrypted' }));

            // Add metadata for Pinata
            const pinataMetadata = JSON.stringify({
                name: `${fileName}_encrypted`,
            });
            formData.append('pinataMetadata', pinataMetadata);

            // Upload encrypted file to IPFS via Pinata
            const fileUploadRes = await axios.post(
                'https://api.pinata.cloud/pinning/pinFileToIPFS',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'pinata_api_key': PINATA_API_KEY,
                        'pinata_secret_api_key': PINATA_API_SECRET
                    }
                }
            );

            const fileCid = fileUploadRes.data.IpfsHash;

            // Create metadata including encryption key
            const metadata = {
                name: fileName,
                description: fileDescription,
                type: file.type,
                size: file.size,
                uploadDate: new Date().toISOString(),
                patientAddress: walletData.address,
                fileCid: fileCid,
                encryptionKey: encryptionKey // In production, encrypt this with patient's public key
            };

            // Upload metadata to IPFS via Pinata
            const metadataRes = await axios.post(
                'https://api.pinata.cloud/pinning/pinJSONToIPFS',
                metadata,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'pinata_api_key': PINATA_API_KEY,
                        'pinata_secret_api_key': PINATA_API_SECRET
                    }
                }
            );

            const metadataCid = metadataRes.data.IpfsHash;

            // Store record in localStorage (in production, use blockchain)
            const records = JSON.parse(localStorage.getItem(`patient_records_${walletData.address}`) || '[]');
            records.push({
                id: Date.now(),
                cid: metadataCid,
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

    const viewRecord = async (record) => {
        try {
            setUploadStatus('Fetching and decrypting record...');

            // In a production app, you would:
            // 1. Fetch the encrypted file from IPFS using the fileCid
            // 2. Decrypt it using the encryption key from metadata
            // 3. Create a download link or display the file

            // For now, just show the encryption key
            alert(`Record can be decrypted with key: ${record.metadata.encryptionKey}`);

            setUploadStatus('');
        } catch (error) {
            console.error("Error viewing record:", error);
            setUploadStatus('Error viewing record: ' + error.message);
        }
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
                                        <p>Metadata CID: {record.cid}</p>
                                        <p>File CID: {record.metadata.fileCid}</p>
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

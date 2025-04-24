// src/components/dashboards/PatientDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { Buffer } from 'buffer';
import CryptoJS from 'crypto-js';

if (!window.Buffer) {
    window.Buffer = Buffer;
}

// Pinata API keys
const PINATA_API_KEY = 'f1efd88c2b40778ca26e';
const PINATA_API_SECRET = '3921f9501ca6abef2b071bf0725456d09033accee84445f731f106cbe135b21c';

// Smart contract ABI for role management (simplified)
const rolesContractABI = [
    "function getUserRole(address _user) external view returns (uint8)",
    "function getAllDoctors() external view returns (address[])",
    "function authorizeDoctor(address doctor) external",
    "function revokeDoctor(address doctor) external",
    "function isDoctorAuthorized(address patient, address doctor) external view returns (bool)"
];

// Smart contract address - replace with your deployed contract
const rolesContractAddress = "YOUR_ROLES_CONTRACT_ADDRESS";

function PatientDashboard({ walletData, onLogout }) {
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [fileDescription, setFileDescription] = useState('');
    const [uploadStatus, setUploadStatus] = useState('');
    const [myRecords, setMyRecords] = useState([]);
    const [allDoctors, setAllDoctors] = useState([]);
    const [authorizedDoctors, setAuthorizedDoctors] = useState({});
    const [rolesContract, setRolesContract] = useState(null);

    // Initialize contract
    useEffect(() => {
        const initContract = async () => {
            if (walletData && walletData.signer) {
                const contract = new ethers.Contract(
                    rolesContractAddress,
                    rolesContractABI,
                    walletData.signer
                );
                setRolesContract(contract);
            }
        };

        initContract();
    }, [walletData]);

    const fetchBalance = useCallback(async () => {
        try {
            const balanceInWei = await walletData.provider.getBalance(walletData.address);
            setBalance(ethers.formatEther(balanceInWei));
        } catch (error) {
            console.error("Error fetching balance:", error);
        } finally {
            setLoading(false);
        }
    }, [walletData]);

    const loadMyRecords = useCallback(() => {
        const records = JSON.parse(localStorage.getItem(`patient_records_${walletData.address}`) || '[]');
        setMyRecords(records);
    }, [walletData.address]);

    const loadAllDoctors = useCallback(async () => {
        if (!rolesContract) return;

        try {
            // Get all doctors from the blockchain
            const doctorAddresses = await rolesContract.getAllDoctors();

            // For each doctor, check if they're authorized by this patient
            const doctorsWithAuth = {};

            for (const address of doctorAddresses) {
                const isAuthorized = await rolesContract.isDoctorAuthorized(walletData.address, address);
                doctorsWithAuth[address] = isAuthorized;
            }

            setAllDoctors(doctorAddresses);
            setAuthorizedDoctors(doctorsWithAuth);
        } catch (error) {
            console.error("Error loading doctors:", error);
        }
    }, [rolesContract, walletData.address]);

    useEffect(() => {
        if (rolesContract) {
            fetchBalance();
            loadMyRecords();
            loadAllDoctors();
        }
    }, [rolesContract, fetchBalance, loadMyRecords, loadAllDoctors]);

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

    const authorizeDoctor = async (doctorAddress) => {
        if (!rolesContract) return;

        try {
            // Call smart contract to authorize doctor
            const tx = await rolesContract.authorizeDoctor(doctorAddress);
            await tx.wait();

            // Update local state
            setAuthorizedDoctors(prev => ({
                ...prev,
                [doctorAddress]: true
            }));
        } catch (error) {
            console.error("Error authorizing doctor:", error);
        }
    };

    const revokeAccess = async (doctorAddress) => {
        if (!rolesContract) return;

        try {
            // Call smart contract to revoke doctor's access
            const tx = await rolesContract.revokeDoctor(doctorAddress);
            await tx.wait();

            // Update local state
            setAuthorizedDoctors(prev => ({
                ...prev,
                [doctorAddress]: false
            }));
        } catch (error) {
            console.error("Error revoking doctor access:", error);
        }
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
                    <h2>Doctor Access Management</h2>
                    <h3>All Registered Doctors</h3>
                    {allDoctors.length === 0 ? (
                        <p>No doctors found in the system</p>
                    ) : (
                        <ul className="doctors-list">
                            {allDoctors.map(doctorAddress => (
                                <li key={doctorAddress} className="doctor-item">
                                    <div className="doctor-info">
                                        <p>Address: {doctorAddress}</p>
                                        <p>Status: {authorizedDoctors[doctorAddress] ? 'Authorized' : 'Not Authorized'}</p>
                                    </div>
                                    <div className="doctor-actions">
                                        {!authorizedDoctors[doctorAddress] ? (
                                            <button
                                                onClick={() => authorizeDoctor(doctorAddress)}
                                                className="authorize-button"
                                            >
                                                Grant Access
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => revokeAccess(doctorAddress)}
                                                className="revoke-button"
                                            >
                                                Revoke Access
                                            </button>
                                        )}
                                    </div>
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

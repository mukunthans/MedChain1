// src/components/Login.jsx
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import RoleSelection from './RoleSelection';

// ABI and contract address remain the same
const contractABI = [
    {
        "inputs": [
            {
                "internalType": "uint8",
                "name": "_roleId",
                "type": "uint8"
            }
        ],
        "name": "registerUser",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "accountNum",
                "type": "uint256"
            },
            {
                "internalType": "uint8",
                "name": "_roleId",
                "type": "uint8"
            }
        ],
        "name": "registerUserByAccountNum",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "user",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "enum MedChainRoles.Role",
                "name": "role",
                "type": "uint8"
            }
        ],
        "name": "RoleAssigned",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "accountNum",
                "type": "uint256"
            }
        ],
        "name": "convertAccountNumToAddress",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "pure",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_user",
                "type": "address"
            }
        ],
        "name": "getUserRole",
        "outputs": [
            {
                "internalType": "uint8",
                "name": "",
                "type": "uint8"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "accountNum",
                "type": "uint256"
            }
        ],
        "name": "getUserRoleByAccountNum",
        "outputs": [
            {
                "internalType": "uint8",
                "name": "",
                "type": "uint8"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_user",
                "type": "address"
            }
        ],
        "name": "isRegistered",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "accountNum",
                "type": "uint256"
            }
        ],
        "name": "isRegisteredByAccountNum",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "registeredUsers",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "userRoles",
        "outputs": [
            {
                "internalType": "enum MedChainRoles.Role",
                "name": "",
                "type": "uint8"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]; // Your existing ABI
const contractAddress = "0x0054018F0dA61fb0BdA13CF8dBb5A9bD652C20AD";

function Login({ onLogin }) {
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState('');
    const [isNewUser, setIsNewUser] = useState(false);
    const [walletData, setWalletData] = useState(null);
    const [showOptions, setShowOptions] = useState(false);

    // Add event listener for account changes
    useEffect(() => {
        if (window.ethereum) {
            // Listen for account changes
            const handleAccountsChanged = async (accounts) => {
                console.log('Account changed:', accounts);

                if (accounts.length > 0) {
                    // Reset state and check if the new account is registered
                    setWalletData(null);
                    setIsNewUser(false);
                    setShowOptions(false);

                    // You could automatically reconnect with the new account
                    await connectWallet();
                } else {
                    // User disconnected all accounts
                    setWalletData(null);
                    setIsNewUser(false);
                    setShowOptions(false);
                }
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);

            // Cleanup listener when component unmounts
            return () => {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            };
        }
    }, []);

    const connectWallet = async () => {
        setIsConnecting(true);
        setError('');

        try {
            // Check if MetaMask is installed
            if (!window.ethereum) {
                throw new Error("MetaMask is not installed. Please install MetaMask to continue.");
            }

            // Request account access - ethers v6 syntax
            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();

            // Create contract instance
            const contract = new ethers.Contract(contractAddress, contractABI, provider);

            // Check if user is registered
            const isRegistered = await contract.isRegistered(address);

            if (isRegistered) {
                // Existing user - get their role
                const roleId = await contract.getUserRole(address);
                const roleName = getRoleName(roleId);

                // Login successful with existing role
                onLogin({
                    address,
                    provider,
                    signer,
                    role: roleName
                });
            } else {
                // New user - need to select role
                setIsNewUser(true);
                setWalletData({
                    address,
                    provider,
                    signer
                });
            }

        } catch (err) {
            console.error("Connection error:", err);
            setError(err.message || "Failed to connect wallet");
        } finally {
            setIsConnecting(false);
        }
    };

    const handleRoleSelect = async (roleId) => {
        try {
            const contract = new ethers.Contract(
                contractAddress,
                contractABI,
                walletData.signer
            );

            // Register user with selected role
            const tx = await contract.registerUser(roleId);
            await tx.wait();

            // Login successful with new role
            onLogin({
                ...walletData,
                role: getRoleName(roleId)
            });

        } catch (err) {
            console.error("Role selection error:", err);
            setError(err.message || "Failed to register role");
        }
    };

    // Helper function to convert role ID to name
    const getRoleName = (roleId) => {
        switch (Number(roleId)) {
            case 1: return 'patient';
            case 2: return 'doctor';
            case 3: return 'insurance-provider';
            default: return 'unknown';
        }
    };

    const handleNewUser = () => {
        setShowOptions(false);
        connectWallet();
    };

    const handleExistingUser = () => {
        setShowOptions(false);
        connectWallet();
    };

    if (isNewUser && walletData) {
        return <RoleSelection onRoleSelect={handleRoleSelect} />;
    }

    return (
        <div className="login-container">
            <h1>MedChain</h1>
            <h2>Secure Medical Records on Hedera</h2>

            <div className="login-card">
                <h3>Connect Your Wallet</h3>
                <p>Please connect your MetaMask wallet to access the dashboard</p>

                {!showOptions ? (
                    <button
                        className="connect-button"
                        onClick={() => setShowOptions(true)}
                        disabled={isConnecting}
                    >
                        Connect Wallet
                    </button>
                ) : (
                    <div className="user-options">
                        <p>Are you a new user or already registered?</p>
                        <div className="button-group">
                            <button
                                className="option-button"
                                onClick={handleNewUser}
                            >
                                New User
                            </button>
                            <button
                                className="option-button"
                                onClick={handleExistingUser}
                            >
                                Existing User
                            </button>
                        </div>
                    </div>
                )}

                {error && <p className="error-message">{error}</p>}
            </div>
        </div>
    );
}

export default Login;
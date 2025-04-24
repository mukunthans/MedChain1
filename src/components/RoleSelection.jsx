// src/components/RoleSelection.jsx
import React, { useState } from 'react';

function RoleSelection({ onRoleSelect }) {
    const [selectedRole, setSelectedRole] = useState(1); // Default to Patient

    return (
        <div className="role-selection-container">
            <h2>Welcome to MedChain</h2>
            <p>Please select your role to continue:</p>

            <div className="role-options">
                <div
                    className={`role-option ${selectedRole === 1 ? 'selected' : ''}`}
                    onClick={() => setSelectedRole(1)}
                >
                    <h3>Patient</h3>
                    <p>Access and manage your medical records</p>
                </div>

                <div
                    className={`role-option ${selectedRole === 2 ? 'selected' : ''}`}
                    onClick={() => setSelectedRole(2)}
                >
                    <h3>Doctor</h3>
                    <p>Manage patient records and treatments</p>
                </div>

                <div
                    className={`role-option ${selectedRole === 3 ? 'selected' : ''}`}
                    onClick={() => setSelectedRole(3)}
                >
                    <h3>Insurance Provider</h3>
                    <p>Process claims and verify coverage</p>
                </div>
            </div>

            <button
                className="role-select-button"
                onClick={() => onRoleSelect(selectedRole)}
            >
                Continue with Selected Role
            </button>
        </div>
    );
}

export default RoleSelection;

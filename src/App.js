//============================================================
// App.js — Main Application Shell
// Decentralized SIM Registration & Identity Audit Log System
// Author/Student : Job Siwila
// University     : ZCAS University Zambia
// ============================================================


import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import simContractABI from './SimContractABI.json';
import './App.css';

// Replace this with your deployed smart contract address
const contractAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [simNumber, setSimNumber] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userRegistration, setUserRegistration] = useState(null);
  const [checkSIM, setCheckSIM] = useState('');
  const [simStatus, setSimStatus] = useState(null);
  const [registrationCount, setRegistrationCount] = useState(0);

  // Load user's registration when wallet connects
  const loadUserRegistration = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, simContractABI, provider);
    const count = await contract.registrationCount();
    setRegistrationCount(Number(count));
      const userSIMHash = await contract.getMyRegistration();
      if (userSIMHash !== ethers.ZeroHash) {
        const details = await contract.getSIMDetails(userSIMHash);
        setUserRegistration({
          simHash: userSIMHash,
          registrant: details.registrant,
          timestamp: details.timestamp,
          isActive: details.isActive
        });
      } else {
        setUserRegistration(null);
      }
    } catch (err) {
      console.error('Error loading registration:', err);
      setUserRegistration(null);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      loadUserRegistration();
    }
  }, [walletAddress]);

  // Connect MetaMask wallet
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        setIsLoading(true);
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAddress(accounts[0]);
        setMessage('Wallet connected: ' + accounts[0]);
      } catch (err) {
        console.error(err);
        setMessage('Wallet connection failed');
      } finally {
        setIsLoading(false);
      }
    } else {
      setMessage('MetaMask not detected');
    }
  };

  // Check SIM registration status
  const checkSIMStatus = async () => {
    if (!checkSIM.trim()) {
      setMessage('Please enter a SIM number to check');
      return;
    }

    try {
      setIsLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, simContractABI, provider);

      const simHash = ethers.keccak256(ethers.toUtf8Bytes(checkSIM.trim()));
      const isRegistered = await contract.isSIMRegistered(simHash);

      if (isRegistered) {
        const details = await contract.getSIMDetails(simHash);
        setSimStatus({
          simHash,
          isRegistered: true,
          registrant: details.registrant,
          timestamp: details.timestamp,
          isActive: details.isActive
        });
        setMessage('SIM status retrieved successfully');
      } else {
        setSimStatus({ simHash, isRegistered: false });
        setMessage('SIM is not registered');
      }
    } catch (err) {
      console.error(err);
      setMessage('Error checking SIM status');
    } finally {
      setIsLoading(false);
    }
  };

  // Deactivate user's SIM
  const deactivateSIM = async () => {
    if (!userRegistration) {
      setMessage('No registration found to deactivate');
      return;
    }

    try {
      setIsLoading(true);
      setMessage('Deactivating SIM...');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, simContractABI, signer);

      const tx = await contract.deactivateSIM(userRegistration.simHash);
      setMessage('Deactivation transaction sent... waiting for confirmation');

      await tx.wait();
      setMessage('SIM deactivated successfully');
      await loadUserRegistration();
    } catch (err) {
      console.error(err);
      setMessage('Error deactivating SIM: ' + (err.reason || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle SIM registration form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !idNumber || !simNumber) {
      setMessage('Please fill all fields');
      return;
    }

    if (!walletAddress) {
      setMessage('Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);
      setMessage('Processing...');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, simContractABI, signer);

      // Hash sensitive data
      const nameHash = ethers.keccak256(ethers.toUtf8Bytes(name));
      const idHash = ethers.keccak256(ethers.toUtf8Bytes(idNumber));
      const simHash = ethers.keccak256(ethers.toUtf8Bytes(simNumber));

      // Call smart contract function
      const tx = await contract.registerSIM(nameHash, idHash, simHash);
      setMessage('Transaction sent... waiting for confirmation');

      await tx.wait(); // Wait for blockchain confirmation
      setMessage('SIM registered successfully on blockchain!');

      // Clear form and reload user data
      setName('');
      setIdNumber('');
      setSimNumber('');
      await loadUserRegistration();
    } catch (err) {
      console.error(err);
      if (err.reason) {
        setMessage('Transaction failed: ' + err.reason);
      } else {
        setMessage('Error submitting transaction: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-cyan-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2 flex items-center justify-center">
            <span className="mr-2">🔐</span> Decentralized SIM Registration & Identity Audit Log System <span className="ml-2">📱</span>
          </h1>
          <p className="text-slate-300 flex items-center justify-center">
            <span className="mr-2">🛡️</span> Secure SIM registration with blockchain verification and privacy-preserving hashing. <span className="ml-2">🔍</span>
          </p>
        </header>

        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 shadow-xl backdrop-blur text-center">
          <h3 className="text-lg font-semibold mb-2">📊 System Statistics</h3>
          <p className="text-2xl font-bold text-cyan-400">{registrationCount}</p>
          <p className="text-slate-300">Total Registered SIMs</p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 shadow-xl backdrop-blur">
        <button 
          className="connect-button"
          onClick={connectWallet} 
          disabled={isLoading}
        >
          {isLoading && <span className="loading-spinner"></span>}
          {isLoading ? 'Connecting...' : walletAddress ? 'Wallet Connected' : 'Connect Wallet'}
        </button>

        {walletAddress && (
          <div className="wallet-info">
            <p><strong>Connected:</strong> {walletAddress}</p>
          </div>
        )}
      </div>

      {/* User Registration Status */}
      {userRegistration && (
        <div className="status-section">
          <h3>Your Registration</h3>
          <div className={`status-display ${userRegistration.isActive ? 'status-active' : 'status-inactive'}`}>
            <p><strong>Status:</strong> {userRegistration.isActive ? 'Active' : 'Inactive'}</p>
            <p><strong>Registered:</strong> {new Date(Number(userRegistration.timestamp) * 1000).toLocaleString()}</p>
          </div>
          <button 
            className="submit-button"
            onClick={deactivateSIM}
            disabled={isLoading || !userRegistration.isActive}
            style={{ marginTop: '10px', width: 'auto' }}
          >
            {isLoading && <span className="loading-spinner"></span>}
            {isLoading ? 'Processing...' : 'Deactivate SIM'}
          </button>
        </div>
      )}

      {/* SIM Registration Form - only show if no active registration */}
      {(!userRegistration || !userRegistration.isActive) && (
      <div className="registration-section">
        <h3>Register New SIM</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">National ID</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter your national ID"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">SIM Number</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter your SIM number"
              value={simNumber}
              onChange={(e) => setSimNumber(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <button 
            type="submit" 
            className="submit-button"
            disabled={isLoading}
          >
            {isLoading && <span className="loading-spinner"></span>}
            {isLoading ? 'Processing...' : 'Register SIM'}
          </button>
        </form>
      </div>
      )}

      {/* Check SIM Status */}
      <div className="check-section">
        <h3>Check SIM Status</h3>
        <div className="check-input-group">
          <input
            type="text"
            className="check-input"
            placeholder="Enter SIM Number"
            value={checkSIM}
            onChange={(e) => setCheckSIM(e.target.value)}
            disabled={isLoading}
          />
          <button 
            className="check-button"
            onClick={checkSIMStatus}
            disabled={isLoading}
          >
            {isLoading && <span className="loading-spinner"></span>}
            {isLoading ? 'Checking...' : 'Check Status'}
          </button>
        </div>

        {simStatus && (
          <div className={
            simStatus.isRegistered
              ? (simStatus.isActive ? 'status-display status-active' : 'status-display status-inactive')
              : 'status-display status-info'
          }>
            {simStatus.isRegistered ? (
              <div>
                <p><strong>Status:</strong> {simStatus.isActive ? 'Active' : 'Inactive'}</p>
                <p><strong>Registrant:</strong> {simStatus.registrant}</p>
                <p><strong>Registered:</strong> {new Date(Number(simStatus.timestamp) * 1000).toLocaleString()}</p>
              </div>
            ) : (
              <p>This SIM is not registered</p>
            )}
          </div>
        )}
      </div>

      {message && (
        <div className="p-4 rounded-xl mt-4 bg-green-600 text-white font-bold text-center shadow-lg border border-green-400">
          {message}
        </div>
      )}
    </div>
  </div>
  );
}

export default App;
//============================================================
// App.js — Main Application Shell
// Decentralized SIM Registration & Identity Audit Log System
// Author/Student : Job Siwila
// University     : ZCAS University Zambia
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import simContractABI from './SimContractABI.json';
import './App.css';

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const HARDHAT_CHAIN_ID = '0x7a69'; // 31337 in hex

function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [simNumber, setSimNumber] = useState('');
  const [message, setMessage] = useState('');
  const [userRegistration, setUserRegistration] = useState(null);
  const [checkSIM, setCheckSIM] = useState('');
  const [simStatus, setSimStatus] = useState(null);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [wrongNetwork, setWrongNetwork] = useState(false);

  // Separate loading states so one operation doesn't block the whole UI
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [loadingDeactivate, setLoadingDeactivate] = useState(false);

  // Reusable provider and contract — created once, not on every call
  const providerRef = useRef(null);
  const contractRef = useRef(null);

  const getProvider = useCallback(() => {
    if (!window.ethereum) return null;
    if (!providerRef.current) {
      providerRef.current = new ethers.BrowserProvider(window.ethereum);
    }
    return providerRef.current;
  }, []);

  const getContract = useCallback((signerOrProvider) => {
    return new ethers.Contract(contractAddress, simContractABI, signerOrProvider);
  }, []);

  // Reset provider cache when account or network changes
  const resetProvider = useCallback(() => {
    providerRef.current = null;
    contractRef.current = null;
  }, []);

  const checkNetwork = useCallback(async () => {
    if (!window.ethereum) return false;
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    const isCorrect = chainId === HARDHAT_CHAIN_ID;
    setWrongNetwork(!isCorrect);
    return isCorrect;
  }, []);

  const loadUserRegistration = useCallback(async () => {
    try {
      const provider = getProvider();
      if (!provider) return;

      const contract = getContract(provider);
      const count = await contract.registrationCount();
      setRegistrationCount(Number(count));

      const signer = await provider.getSigner();
      const connectedContract = getContract(signer);
      const userSIMHash = await connectedContract.getMyRegistration();

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
  }, [getProvider, getContract]);

  // Load data when wallet connects
  useEffect(() => {
    if (walletAddress) {
      loadUserRegistration();
    }
  }, [walletAddress, loadUserRegistration]);

  // Listen for MetaMask account and network changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      resetProvider();
      if (accounts.length === 0) {
        setWalletAddress('');
        setUserRegistration(null);
        setMessage('Wallet disconnected');
      } else {
        setWalletAddress(accounts[0]);
        setMessage('Switched to: ' + accounts[0]);
      }
      setSimStatus(null);
    };

    const handleChainChanged = () => {
      resetProvider();
      checkNetwork();
      if (walletAddress) {
        loadUserRegistration();
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [walletAddress, resetProvider, checkNetwork, loadUserRegistration]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setMessage('MetaMask not detected. Please install it to use this app.');
      return;
    }

    try {
      setLoadingWallet(true);

      const onCorrectNetwork = await checkNetwork();
      if (!onCorrectNetwork) {
        setMessage('Please switch MetaMask to the Hardhat network (Chain ID 31337)');
        return;
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWalletAddress(accounts[0]);
      setMessage('Wallet connected: ' + accounts[0]);
    } catch (err) {
      console.error(err);
      setMessage('Wallet connection failed');
    } finally {
      setLoadingWallet(false);
    }
  };

  const checkSIMStatus = async () => {
    if (!checkSIM.trim()) {
      setMessage('Please enter a SIM number to check');
      return;
    }

    try {
      setLoadingCheck(true);
      const provider = getProvider();
      if (!provider) return;

      const contract = getContract(provider);
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
      setLoadingCheck(false);
    }
  };

  const deactivateSIM = async () => {
    if (!userRegistration) {
      setMessage('No registration found to deactivate');
      return;
    }

    try {
      setLoadingDeactivate(true);
      setMessage('Deactivating SIM...');

      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = getContract(signer);

      const tx = await contract.deactivateSIM(userRegistration.simHash);
      setMessage('Deactivation transaction sent... waiting for confirmation');

      await tx.wait();
      setMessage('SIM deactivated successfully');
      await loadUserRegistration();
    } catch (err) {
      console.error(err);
      setMessage('Error deactivating SIM: ' + (err.reason || err.message));
    } finally {
      setLoadingDeactivate(false);
    }
  };

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
      setLoadingRegister(true);
      setMessage('Processing...');

      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = getContract(signer);

      const nameHash = ethers.keccak256(ethers.toUtf8Bytes(name));
      const idHash = ethers.keccak256(ethers.toUtf8Bytes(idNumber));
      const simHash = ethers.keccak256(ethers.toUtf8Bytes(simNumber));

      const tx = await contract.registerSIM(nameHash, idHash, simHash);
      setMessage('Transaction sent... waiting for confirmation');

      await tx.wait();
      setMessage('SIM registered successfully on blockchain!');

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
      setLoadingRegister(false);
    }
  };

  const hasActiveRegistration = userRegistration && userRegistration.isActive;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-cyan-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2 flex items-center justify-center">
            <span className="mr-2">🔐</span> Decentralized SIM Registration and Identity Audit Log System <span className="ml-2">📱</span>
          </h1>
          <p className="text-slate-300 flex items-center justify-center">
            <span className="mr-2">🛡️</span> Secure SIM registration with blockchain verification and privacy-preserving hashing. <span className="ml-2">🔍</span>
          </p>
        </header>

        {wrongNetwork && (
          <div className="p-4 border rounded-xl bg-amber-200/20 border-amber-400 text-amber-100 text-center">
            Wrong network detected. Please switch MetaMask to <strong>Hardhat (Chain ID 31337)</strong>.
          </div>
        )}

        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 shadow-xl backdrop-blur text-center">
          <h3 className="text-lg font-semibold mb-2">📊 System Statistics</h3>
          <p className="text-2xl font-bold text-cyan-400">{registrationCount}</p>
          <p className="text-slate-300">Total Registered SIMs</p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 shadow-xl backdrop-blur">
          <button
            className="connect-button"
            onClick={connectWallet}
            disabled={loadingWallet}
          >
            {loadingWallet && <span className="loading-spinner"></span>}
            {loadingWallet ? 'Connecting...' : walletAddress ? 'Wallet Connected' : 'Connect Wallet'}
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
            {userRegistration.isActive && (
              <button
                className="submit-button"
                onClick={deactivateSIM}
                disabled={loadingDeactivate}
                style={{ marginTop: '10px', width: 'auto' }}
              >
                {loadingDeactivate && <span className="loading-spinner"></span>}
                {loadingDeactivate ? 'Processing...' : 'Deactivate SIM'}
              </button>
            )}
          </div>
        )}

        {/* Only show form if the user hasn't registered yet */}
        {!hasActiveRegistration && (
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
                  disabled={loadingRegister}
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
                  disabled={loadingRegister}
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
                  disabled={loadingRegister}
                  required
                />
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={loadingRegister || !walletAddress}
              >
                {loadingRegister && <span className="loading-spinner"></span>}
                {loadingRegister ? 'Processing...' : 'Register SIM'}
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
              disabled={loadingCheck}
            />
            <button
              className="check-button"
              onClick={checkSIMStatus}
              disabled={loadingCheck}
            >
              {loadingCheck && <span className="loading-spinner"></span>}
              {loadingCheck ? 'Checking...' : 'Check Status'}
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
          <div className={
            message.toLowerCase().includes('success')
              ? 'p-4 border rounded-xl mt-4 bg-emerald-200/20 border-emerald-400 text-emerald-100'
              : message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')
                ? 'p-4 border rounded-xl mt-4 bg-rose-200/20 border-rose-400 text-rose-100'
                : 'p-4 border rounded-xl mt-4 bg-sky-200/20 border-sky-400 text-sky-100'
          }>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

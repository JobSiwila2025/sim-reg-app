//============================================================
// App.js - Main Application Shell
// Decentralized SIM Registration & Identity Audit Log System
// Author/Student : Job Siwila
// University     : ZCAS University Zambia
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import simContractABI from './SimContractABI.json';
import './App.css';

const contractAddress = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
const adminActionPassword = process.env.REACT_APP_ADMIN_PASSWORD || 'Admin@2026!';

function App() {
  const providerRules = useMemo(() => ({
    MTN: ['096', '076'],
    Airtel: ['097', '077'],
    Zamtel: ['095', '075'],
    ZedMobile: ['098', '078']
  }), []);

  const providerOptions = useMemo(() => Object.keys(providerRules), [providerRules]);
  const actionLabels = ['Registered', 'Deactivated', 'Reactivated'];
  const hasWallet = typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  const expectedChainId = 31337;

  const [walletAddress, setWalletAddress] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('register');
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [simNumber, setSimNumber] = useState('');
  const [providerName, setProviderName] = useState('MTN');
  const [checkSIM, setCheckSIM] = useState('');
  const [adminSIM, setAdminSIM] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [activeSIMCount, setActiveSIMCount] = useState(0);
  const [userSIMs, setUserSIMs] = useState([]);
  const [userHistory, setUserHistory] = useState([]);
  const [adminHistory, setAdminHistory] = useState([]);
  const [simStatus, setSimStatus] = useState(null);
  const [networkStatus, setNetworkStatus] = useState({
    chainId: null,
    isCorrectNetwork: false,
    contractDeployed: false,
    adminAddress: ''
  });

  const normalizeSimNumber = useCallback((value) => {
    const digitsOnly = value.replace(/\D/g, '');

    if (digitsOnly.startsWith('260') && digitsOnly.length === 12) {
      return `0${digitsOnly.slice(3)}`;
    }

    return digitsOnly;
  }, []);

  const detectProvider = useCallback((value) => {
    const normalized = normalizeSimNumber(value);

    return providerOptions.find((option) =>
      providerRules[option].some((prefix) => normalized.startsWith(prefix))
    ) || null;
  }, [normalizeSimNumber, providerOptions, providerRules]);

  const validateSimForProvider = useCallback((value, selectedProvider) => {
    const normalized = normalizeSimNumber(value);

    if (!/^0\d{9}$/.test(normalized)) {
      return 'Enter a valid Zambian SIM number in the format 09XXXXXXXXX or +2609XXXXXXXX.';
    }

    const allowedPrefixes = providerRules[selectedProvider] || [];
    if (!allowedPrefixes.some((prefix) => normalized.startsWith(prefix))) {
      return `${selectedProvider} numbers must start with ${allowedPrefixes.join(' or ')}.`;
    }

    return null;
  }, [normalizeSimNumber, providerRules]);

  const getProvider = useCallback(() => {
    if (!hasWallet) {
      throw new Error('MetaMask or another Ethereum wallet was not detected.');
    }

    return new ethers.BrowserProvider(window.ethereum);
  }, [hasWallet]);

  const getCurrentChainId = useCallback(async () => {
    if (!hasWallet) {
      throw new Error('MetaMask or another Ethereum wallet was not detected.');
    }

    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
    return parseInt(chainIdHex, 16);
  }, [hasWallet]);

  const formatContractError = useCallback((err, fallbackMessage) => {
    const rawMessage =
      err?.reason ||
      err?.shortMessage ||
      err?.error?.message ||
      err?.message ||
      'Unknown error';
    const normalizedMessage = rawMessage.toLowerCase();

    if (normalizedMessage.includes('missing revert data') || normalizedMessage.includes('call_exception')) {
      return 'Contract call failed. Check the Hardhat network, contract deployment, and selected MetaMask account.';
    }

    if (normalizedMessage.includes('could not coalesce error')) {
      return 'Wallet RPC error. Make sure MetaMask is unlocked and connected to Hardhat Localhost (Chain ID 31337).';
    }

    if (
      normalizedMessage.includes('user rejected') ||
      normalizedMessage.includes('rejected the request') ||
      normalizedMessage.includes('action_rejected')
    ) {
      return 'Request was cancelled in MetaMask.';
    }

    return fallbackMessage ? `${fallbackMessage}: ${rawMessage}` : rawMessage;
  }, []);

  const getContract = useCallback(async ({ useSigner = false, requireAccount = false } = {}) => {
    const provider = getProvider();
    const chainId = await getCurrentChainId();

    if (chainId !== expectedChainId) {
      throw new Error('Wrong network. Please switch MetaMask to Hardhat Localhost (Chain ID 31337).');
    }

    if (requireAccount) {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (!accounts.length) {
        throw new Error('Please connect your wallet first.');
      }
    }

    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
      throw new Error(`No contract found at ${contractAddress}. Redeploy the contract to localhost.`);
    }

    if (useSigner) {
      const signer = await provider.getSigner();
      return new ethers.Contract(contractAddress, simContractABI, signer);
    }

    return new ethers.Contract(contractAddress, simContractABI, provider);
  }, [expectedChainId, getCurrentChainId, getProvider]);

  const loadPublicData = useCallback(async () => {
    if (!hasWallet) {
      setNetworkStatus({
        chainId: null,
        isCorrectNetwork: false,
        contractDeployed: false,
        adminAddress: ''
      });
      return;
    }

    try {
      const provider = getProvider();
      const chainId = await getCurrentChainId();
      const code = await provider.getCode(contractAddress);
      let adminAddress = '';
      let count = 0;
      let activeCount = 0;

      if (code !== '0x') {
        const contract = new ethers.Contract(contractAddress, simContractABI, provider);
        adminAddress = await contract.admin();
        count = Number(await contract.registrationCount());
        const history = Array.from(await contract.getAllHistory());
        const latestStateBySIM = new Map();

        history.forEach((eventItem) => {
          const action = Number(eventItem.action);
          if (action === 0) {
            latestStateBySIM.set(eventItem.simHash, true);
          } else if (action === 1) {
            latestStateBySIM.set(eventItem.simHash, false);
          } else if (action === 2) {
            latestStateBySIM.set(eventItem.simHash, true);
          }
        });

        activeCount = Array.from(latestStateBySIM.values()).filter(Boolean).length;
      }

      setRegistrationCount(count);
      setActiveSIMCount(activeCount);
      setNetworkStatus({
        chainId,
        isCorrectNetwork: chainId === expectedChainId,
        contractDeployed: code !== '0x',
        adminAddress
      });

      if (walletAddress) {
        setIsAdmin(Boolean(adminAddress) && adminAddress.toLowerCase() === walletAddress.toLowerCase());
      }
    } catch (err) {
      console.error('Error loading public data:', err);
      setNetworkStatus({
        chainId: null,
        isCorrectNetwork: false,
        contractDeployed: false,
        adminAddress: ''
      });
      setActiveSIMCount(0);
    }
  }, [expectedChainId, getCurrentChainId, getProvider, hasWallet, walletAddress]);

  const loadConnectedAccountData = useCallback(async (account) => {
    if (!account) {
      setUserSIMs([]);
      setUserHistory([]);
      setAdminHistory([]);
      setIsAdmin(false);
      return;
    }

    try {
      const contract = await getContract();
      const adminAddress = await contract.admin();
      const adminUser = adminAddress.toLowerCase() === account.toLowerCase();
      const userHashes = Array.from(await contract.getUserSIMs(account));
      const history = Array.from(await contract.getUserHistory(account));
      const userRecords = await Promise.all(
        userHashes.map(async (simHash) => {
          const details = await contract.getSIMDetails(simHash);
          return {
            simHash,
            providerName: null,
            registrant: details.registrant,
            timestamp: Number(details.timestamp),
            isActive: details.isActive
          };
        })
      );

      let historyRecords = [];
      if (adminUser) {
        historyRecords = Array.from(await contract.getAllHistory());
      }

      setIsAdmin(adminUser);
      setUserSIMs([...userRecords].reverse());
      setUserHistory([...history].reverse());
      setAdminHistory(adminUser ? [...historyRecords].reverse() : []);
      setNetworkStatus((current) => ({ ...current, adminAddress }));

      if (adminUser && activeTab !== 'audit') {
        setActiveTab('audit');
      }
    } catch (err) {
      console.error('Error loading connected account data:', err);
      setMessage(formatContractError(err, 'Error loading account data'));
      setUserSIMs([]);
      setUserHistory([]);
      setAdminHistory([]);
    }
  }, [activeTab, formatContractError, getContract]);

  useEffect(() => {
    const initialize = async () => {
      if (!hasWallet) {
        setMessage('Install MetaMask to connect your wallet.');
        return;
      }

      await loadPublicData();
    };

    initialize();
  }, [hasWallet, loadPublicData]);

  useEffect(() => {
    if (!hasWallet) {
      return undefined;
    }

    const handleAccountsChanged = async (accounts) => {
      const nextAccount = accounts[0] || '';
      setWalletAddress(nextAccount);
      setSimStatus(null);
      setMessage('');
      await loadPublicData();
      await loadConnectedAccountData(nextAccount);
    };

    const handleChainChanged = async () => {
      setSimStatus(null);
      setMessage('');
      await loadPublicData();
      await loadConnectedAccountData(walletAddress);
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [hasWallet, loadConnectedAccountData, loadPublicData, walletAddress]);

  const connectWallet = async () => {
    if (!hasWallet) {
      setMessage('Install MetaMask to connect your wallet.');
      return;
    }

    try {
      setIsLoading(true);
      setMessage('Connecting wallet...');

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0] || '';
      setWalletAddress(account);

      await loadPublicData();
      await loadConnectedAccountData(account);
      setMessage('Wallet connected successfully.');
    } catch (err) {
      console.error(err);
      setMessage(formatContractError(err, 'Error connecting wallet'));
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress('');
    setIsAdmin(false);
    setUserSIMs([]);
    setUserHistory([]);
    setAdminHistory([]);
    setSimStatus(null);
    setMessage('Wallet disconnected from the app.');
    setActiveTab('register');
  };

  const refreshData = useCallback(async () => {
    await loadPublicData();
    await loadConnectedAccountData(walletAddress);
  }, [loadConnectedAccountData, loadPublicData, walletAddress]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !idNumber.trim() || !simNumber.trim()) {
      setMessage('Please fill all fields.');
      return;
    }

    if (!walletAddress) {
      setMessage('Please connect your wallet first.');
      return;
    }

    const simValidationError = validateSimForProvider(simNumber.trim(), providerName);
    if (simValidationError) {
      setMessage(simValidationError);
      return;
    }

    try {
      setIsLoading(true);
      setMessage('Processing registration...');

      const contract = await getContract({ useSigner: true, requireAccount: true });
      const normalizedSIM = normalizeSimNumber(simNumber.trim());
      const simHash = ethers.keccak256(ethers.toUtf8Bytes(normalizedSIM));
      const exists = await contract.isSIMRegistered(simHash);

      if (exists) {
        setMessage('SIM already registered.');
        return;
      }

      const tx = await contract.registerSIM(
        ethers.keccak256(ethers.toUtf8Bytes(name.trim())),
        ethers.keccak256(ethers.toUtf8Bytes(idNumber.trim())),
        simHash
      );

      setMessage('Transaction sent. Waiting for confirmation...');
      await tx.wait();

      setName('');
      setIdNumber('');
      setSimNumber('');
      await refreshData();
      setActiveTab('portfolio');
      setMessage('SIM registered successfully on blockchain.');
    } catch (err) {
      console.error(err);
      setMessage(formatContractError(err, 'Error submitting transaction'));
    } finally {
      setIsLoading(false);
    }
  };

  const checkSIMStatus = async () => {
    if (!checkSIM.trim()) {
      setMessage('Please enter a SIM number to check.');
      return;
    }

    try {
      setIsLoading(true);
      setMessage('Checking SIM status...');

      const contract = await getContract();
      const normalizedSIM = normalizeSimNumber(checkSIM.trim());
      const simHash = ethers.keccak256(ethers.toUtf8Bytes(normalizedSIM));
      const isRegistered = await contract.isSIMRegistered(simHash);

      if (isRegistered) {
        const details = await contract.getSIMDetails(simHash);
        setSimStatus({
          simHash,
          providerName: detectProvider(normalizedSIM),
          registrant: details.registrant,
          timestamp: Number(details.timestamp),
          isActive: details.isActive,
          isRegistered: true
        });
        setMessage('SIM status retrieved successfully.');
      } else {
        setSimStatus({
          simHash,
          providerName: detectProvider(normalizedSIM),
          isRegistered: false
        });
        setMessage('SIM is not registered.');
      }
    } catch (err) {
      console.error(err);
      setMessage(formatContractError(err, 'Error checking SIM status'));
    } finally {
      setIsLoading(false);
    }
  };

  const manageSIMStatus = async (action) => {
    if (!isAdmin) {
      setMessage('Only the admin account can manage SIM status.');
      return;
    }

    if (!adminActionPassword) {
      setMessage('Admin password is not configured. Set REACT_APP_ADMIN_PASSWORD and restart the frontend.');
      return;
    }

    if (adminPassword !== adminActionPassword) {
      setMessage('Incorrect admin password.');
      return;
    }

    if (!adminSIM.trim()) {
      setMessage('Enter a SIM number for the admin action.');
      return;
    }

    const normalizedSIM = normalizeSimNumber(adminSIM.trim());
    if (!/^0\d{9}$/.test(normalizedSIM)) {
      setMessage('Enter a valid SIM number for the admin action.');
      return;
    }

    try {
      setIsLoading(true);
      setMessage(`${action === 'deactivate' ? 'Deactivating' : 'Reactivating'} SIM...`);

      const contract = await getContract({ useSigner: true, requireAccount: true });
      const simHash = ethers.keccak256(ethers.toUtf8Bytes(normalizedSIM));

      if (action === 'deactivate') {
        const tx = await contract.deactivateSIM(simHash);
        await tx.wait();
        setMessage('SIM deactivated by admin.');
      } else {
        const tx = await contract.reactivateSIM(simHash);
        await tx.wait();
        setMessage('SIM reactivated by admin.');
      }

      await refreshData();
      setAdminSIM('');
      setAdminPassword('');
    } catch (err) {
      console.error(err);
      setMessage(formatContractError(err, `Error trying to ${action} the SIM`));
    } finally {
      setIsLoading(false);
    }
  };

  const messageClassName = message.toLowerCase().includes('success') || message.toLowerCase().includes('connected')
    ? 'message message-success'
    : message.toLowerCase().includes('error') || message.toLowerCase().includes('wrong') || message.toLowerCase().includes('failed')
      ? 'message message-error'
      : 'message message-info';

  return (
    <div className="sim-container">
      <div className="sim-header">
        <div className="hero-kicker">Blockchain Identity Infrastructure</div>
        <h1>Decentralized SIM Registration &amp; Identity Audit Log System</h1>
        <p>Register many SIMs per wallet, audit them transparently, and reserve lifecycle control for the administrator account.</p>
      </div>

      <div className="dashboard-grid">
        <div className="wallet-section featured-panel">
          <div className="section-head">
            <div>
              <span className="section-label">Wallet Access</span>
              <h3>Connection Control</h3>
            </div>
            <span className={`status-pill ${walletAddress ? 'status-pill-live' : 'status-pill-muted'}`}>
              {walletAddress ? (isAdmin ? 'Admin' : 'User') : 'Idle'}
            </span>
          </div>

          <button className="connect-button" onClick={connectWallet} disabled={isLoading}>
            {isLoading && <span className="loading-spinner"></span>}
            {walletAddress ? 'Wallet Connected' : 'Connect Wallet'}
          </button>

          {walletAddress && (
            <div className="wallet-info">
              <p><strong>Connected:</strong> {walletAddress}</p>
              <p><strong>Role:</strong> {isAdmin ? 'Administrator' : 'Registrant'}</p>
              <button className="submit-button" onClick={disconnectWallet} disabled={isLoading} style={{ marginTop: '12px' }}>
                Disconnect Wallet
              </button>
            </div>
          )}
        </div>

        <div className="wallet-section stat-panel">
          <span className="section-label">Live Metric</span>
          <h3>Total Registration Records</h3>
          <p className="stat-value">{registrationCount}</p>
          <p className="stat-caption">Every successful registration ever recorded by the current local contract deployment.</p>
          <p className="stat-caption" style={{ marginTop: '10px' }}><strong>Currently Active SIMs:</strong> {activeSIMCount}</p>
        </div>

        <div className="wallet-section network-panel">
          <div className="section-head">
            <div>
              <span className="section-label">Environment</span>
              <h3>Network &amp; Contract Status</h3>
            </div>
            <span className={`status-pill ${networkStatus.isCorrectNetwork && networkStatus.contractDeployed ? 'status-pill-live' : 'status-pill-alert'}`}>
              {networkStatus.isCorrectNetwork && networkStatus.contractDeployed ? 'Ready' : 'Attention'}
            </span>
          </div>
          <div className="info-list">
            <p><strong>Expected Chain:</strong> Hardhat Localhost (31337)</p>
            <p><strong>Detected Chain:</strong> {networkStatus.chainId ?? 'Not available'}</p>
            <p><strong>Network Status:</strong> {networkStatus.isCorrectNetwork ? 'Connected to correct network' : 'Wrong network or wallet unavailable'}</p>
            <p><strong>Contract Status:</strong> {networkStatus.contractDeployed ? 'Contract deployed at configured address' : 'No contract found at configured address'}</p>
            <p><strong>Admin Address:</strong> <span className="mono-text">{networkStatus.adminAddress || 'Not available'}</span></p>
            <p><strong>Contract Address:</strong> <span className="mono-text">{contractAddress}</span></p>
          </div>
        </div>
      </div>

      <div className="tab-strip">
        <button
          className={`tab-button ${activeTab === 'register' ? 'tab-button-active' : ''}`}
          onClick={() => setActiveTab('register')}
        >
          Register SIM
        </button>
        <button
          className={`tab-button ${activeTab === 'portfolio' ? 'tab-button-active' : ''}`}
          onClick={() => setActiveTab('portfolio')}
        >
          My SIMs
        </button>
        <button
          className={`tab-button ${activeTab === 'verify' ? 'tab-button-active' : ''}`}
          onClick={() => setActiveTab('verify')}
        >
          Verify SIM
        </button>
        {isAdmin && (
          <button
            className={`tab-button ${activeTab === 'audit' ? 'tab-button-active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            Admin Audit
          </button>
        )}
      </div>

      {activeTab === 'register' && (
        <div className="registration-section">
          <div className="section-head">
            <div>
              <span className="section-label">Onboarding</span>
              <h3>Register New SIM</h3>
            </div>
          </div>
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
              <label className="form-label">Mobile Network</label>
              <select
                className="form-input"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                disabled={isLoading}
              >
                {providerOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
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
              <small className="helper-text">
                Validation supports {providerName} prefixes {providerRules[providerName].join(' / ')} before the number is hashed and sent on-chain.
              </small>
            </div>

            <button type="submit" className="submit-button" disabled={isLoading}>
              {isLoading && <span className="loading-spinner"></span>}
              {isLoading ? 'Processing...' : 'Register SIM'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'portfolio' && (
        <div className="status-section">
          <div className="section-head">
            <div>
              <span className="section-label">Portfolio</span>
              <h3>My Registered SIMs</h3>
              {walletAddress && (
                <p className="section-meta">
                  Viewing records for <span className="mono-text">{walletAddress}</span>
                </p>
              )}
            </div>
          </div>

          {!walletAddress ? (
            <p>Connect your wallet to view your registered SIM cards.</p>
          ) : !userSIMs.length ? (
            <p>
              No SIMs are registered for this connected wallet yet. The contract currently has {registrationCount} total registration
              {registrationCount === 1 ? '' : 's'}, but they may belong to a different account.
            </p>
          ) : (
            <div className="record-grid">
              {userSIMs.map((record) => (
                <div key={record.simHash} className={`history-item ${record.isActive ? 'action-registered' : 'action-deactivated'}`}>
                  <p><strong>SIM Hash:</strong> <span className="mono-text">{record.simHash}</span></p>
                  <p><strong>Status:</strong> {record.isActive ? 'Active' : 'Inactive'}</p>
                  <p><strong>Registered:</strong> {new Date(record.timestamp * 1000).toLocaleString()}</p>
                  <p><strong>Registrant:</strong> {record.registrant}</p>
                </div>
              ))}
            </div>
          )}

          <div className="history-section slim-panel">
            <div className="section-head">
              <div>
                <span className="section-label">Timeline</span>
                <h3>My Activity</h3>
              </div>
            </div>
            {!walletAddress ? (
              <p>Connect your wallet to view your activity timeline.</p>
            ) : !userHistory.length ? (
              <p>No audit history found for this wallet yet.</p>
            ) : (
              <div className="history-list">
                {userHistory.map((eventItem, index) => (
                  <div
                    key={`${eventItem.timestamp}-${index}`}
                    className={`history-item ${
                      Number(eventItem.action) === 0
                        ? 'action-registered'
                        : Number(eventItem.action) === 1
                          ? 'action-deactivated'
                          : 'action-reactivated'
                    }`}
                  >
                    <p><strong>Action:</strong> {actionLabels[Number(eventItem.action)] || 'Unknown'}</p>
                    <p><strong>SIM Hash:</strong> <span className="mono-text">{eventItem.simHash}</span></p>
                    <p><strong>Time:</strong> {new Date(Number(eventItem.timestamp) * 1000).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'verify' && (
        <div className="check-section">
          <div className="section-head">
            <div>
              <span className="section-label">Verification</span>
              <h3>Check SIM Status</h3>
            </div>
          </div>
          <div className="check-input-group">
            <input
              type="text"
              className="check-input"
              placeholder="Enter SIM Number"
              value={checkSIM}
              onChange={(e) => setCheckSIM(e.target.value)}
              disabled={isLoading}
            />
            <button className="check-button" onClick={checkSIMStatus} disabled={isLoading}>
              {isLoading && <span className="loading-spinner"></span>}
              {isLoading ? 'Checking...' : 'Check Status'}
            </button>
          </div>

          {simStatus && (
            <div className={simStatus.isRegistered ? `status-display ${simStatus.isActive ? 'status-active' : 'status-inactive'}` : 'status-display status-info'}>
              {simStatus.isRegistered ? (
                <>
                  <p><strong>Detected Provider:</strong> {simStatus.providerName || 'Unknown'}</p>
                  <p><strong>Status:</strong> {simStatus.isActive ? 'Active' : 'Inactive'}</p>
                  <p><strong>Registrant:</strong> {simStatus.registrant}</p>
                  <p><strong>Registered:</strong> {new Date(simStatus.timestamp * 1000).toLocaleString()}</p>
                  <p><strong>SIM Hash:</strong> <span className="mono-text">{simStatus.simHash}</span></p>
                </>
              ) : (
                <>
                  <p>This SIM is not registered.</p>
                  <p><strong>Detected Provider:</strong> {simStatus.providerName || 'Unknown'}</p>
                  <p><strong>SIM Hash:</strong> <span className="mono-text">{simStatus.simHash}</span></p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'audit' && isAdmin && (
        <div className="history-section">
          <div className="section-head">
            <div>
              <span className="section-label">Administrator</span>
              <h3>SIM Lifecycle Management</h3>
            </div>
            <span className="status-pill status-pill-live">Admin Only</span>
          </div>

          <div className="admin-panel">
            <div className="form-group">
              <label className="form-label">SIM Number For Admin Action</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter SIM number to deactivate or reactivate"
                value={adminSIM}
                onChange={(e) => setAdminSIM(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Admin Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter admin password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                disabled={isLoading}
              />
              <small className="helper-text">
                This password check is enforced in the frontend. Configure it with <span className="mono-text">REACT_APP_ADMIN_PASSWORD</span>.
              </small>
            </div>
            <div className="admin-actions">
              <button className="submit-button" onClick={() => manageSIMStatus('deactivate')} disabled={isLoading}>
                {isLoading && <span className="loading-spinner"></span>}
                Deactivate SIM
              </button>
              <button className="check-button" onClick={() => manageSIMStatus('reactivate')} disabled={isLoading}>
                {isLoading && <span className="loading-spinner"></span>}
                Reactivate SIM
              </button>
              <button className="tab-button" onClick={() => setActiveTab('register')} disabled={isLoading}>
                Back To Registration
              </button>
            </div>
          </div>

          <div className="section-head">
            <div>
              <span className="section-label">Transparency</span>
              <h3>Global Audit Trail</h3>
            </div>
          </div>
          {!adminHistory.length ? (
            <p>No registration events recorded yet.</p>
          ) : (
            <div className="history-list">
              {adminHistory.map((eventItem, index) => (
                <div
                  key={`${eventItem.timestamp}-${index}`}
                  className={`history-item ${
                    Number(eventItem.action) === 0
                      ? 'action-registered'
                      : Number(eventItem.action) === 1
                        ? 'action-deactivated'
                        : 'action-reactivated'
                  }`}
                >
                  <p><strong>Action:</strong> {actionLabels[Number(eventItem.action)] || 'Unknown'}</p>
                  <p><strong>Registrant:</strong> {eventItem.registrant}</p>
                  <p><strong>SIM Hash:</strong> <span className="mono-text">{eventItem.simHash}</span></p>
                  <p><strong>Time:</strong> {new Date(Number(eventItem.timestamp) * 1000).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {message && <div className={messageClassName}>{message}</div>}
    </div>
  );
}

export default App;

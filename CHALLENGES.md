# SIM Registration UI Challenges & Progress

This document tracks the challenges encountered during the development and setup of the SIM Registration UI project, together with the actions taken to resolve them.

## Assignment Assessment

**Problem Chosen**: Decentralized SIM card registration system for secure, privacy-preserving storage and verification of user identification data on blockchain.

**Group Roles**:
- Student 1: Smart Contracts
- Student 2: User Interaction & Wallet Integration
- Student 3: Blockchain Development Tools & Infrastructure
- Student 4: User Interface Development
- All Students: Gas Optimization, Testing, Documentation, Presentation, Personal Reflection

**Current Status Against Requirements**:
- Completed smart contract development and ABI synchronization
- Completed wallet connection and transaction handling
- Completed Hardhat setup, deployment scripts, and test suite
- Completed frontend dashboard and role-based UI improvements
- Completed gas-conscious smart contract design
- Completed documentation, report writing, and presentation material preparation

## Early Project Challenges

### 1. Missing Dependencies
- **Issue**: The `ethers` library was not installed, causing import and compile errors.
- **Status**: Resolved
- **Resolution**: Installed `ethers` v6 and updated project dependencies.

### 2. ethers.js Version Compatibility
- **Issue**: The original code used older ethers.js syntax that did not match ethers v6.
- **Status**: Resolved
- **Resolution**: Updated the code to use ethers v6 APIs such as `BrowserProvider`, `keccak256`, and `toUtf8Bytes`.

### 3. Missing Smart Contract ABI
- **Issue**: `SimContractABI.json` was referenced by the frontend but was missing or outdated.
- **Status**: Resolved
- **Resolution**: Generated and synchronized the ABI from the compiled smart contract artifact.

### 4. Contract Address Setup
- **Issue**: The application initially used a placeholder or outdated contract address.
- **Status**: Resolved
- **Resolution**: Deployed the contract locally and updated the frontend with the correct address.

## Challenges Faced During Recent Development

### 5. Corrupted Frontend Component Structure
- **Issue**: `src/App.js` contained duplicated JSX, malformed handlers, and missing logic such as `connectWallet`, which prevented stable compilation.
- **Status**: Resolved
- **Resolution**: Rebuilt the component into a clean React structure and verified it using a successful production build.
- **Date**: April 2026

### 6. Contract Call Errors From Wrong Network Or Missing Deployment
- **Issue**: The frontend produced errors such as `missing revert data` when MetaMask was on the wrong network or the configured address did not point to a valid deployed contract.
- **Status**: Resolved
- **Resolution**: Added checks for chain ID, contract code presence, and clearer contract/network error messages. Redeployed and updated the contract address.
- **Date**: April 2026

### 7. Wallet RPC Error: `could not coalesce error`
- **Issue**: Account-specific contract reads sometimes failed because MetaMask returned an RPC response ethers could not normalize properly.
- **Status**: Resolved
- **Resolution**: Separated public blockchain reads from account-dependent reads and improved wallet/network diagnostics in the frontend.
- **Date**: April 2026

### 8. Wallet Auto-Connection Did Not Match Expected UX
- **Issue**: The wallet was reconnecting automatically on page load because the app restored previously approved MetaMask sessions.
- **Status**: Resolved
- **Resolution**: Changed the app to connect only when the user explicitly clicks `Connect Wallet` and added a local UI disconnect feature.
- **Date**: April 2026

### 9. Contract Limitation: One SIM Per Wallet
- **Issue**: The original smart contract allowed only one SIM per wallet, which no longer matched the updated requirement.
- **Status**: Resolved
- **Resolution**: Redesigned the smart contract to support multiple SIM registrations per wallet and added `getUserSIMs` for retrieval.
- **Date**: April 2026

### 10. Admin-Only Lifecycle Management Requirement
- **Issue**: SIM deactivation and reactivation were originally user-controlled, but the final design required these actions to be restricted to an administrator account.
- **Status**: Resolved
- **Resolution**: Added an admin address in the smart contract, restricted lifecycle management functions, updated tests, and redesigned the frontend with an admin-only management panel.
- **Date**: April 2026

### 11. Frontend Admin Password Configuration
- **Issue**: The admin panel reported that the password was not configured because the environment variable was not yet loaded into the running frontend session.
- **Status**: Resolved
- **Resolution**: Added a local `.env` file, updated `.gitignore`, documented the password setup, and added a development fallback password.
- **Date**: April 2026

### 12. Incorrect Zambian SIM Validation Pattern
- **Issue**: Valid Zambian SIM numbers were being rejected because the regex expected the wrong number of digits.
- **Status**: Resolved
- **Resolution**: Corrected the validation logic to support proper local and `+260` mobile number formats.
- **Date**: April 2026

### 13. Read-Only Array Error In Frontend State Handling
- **Issue**: The frontend threw `Cannot assign to read only property '0' of object '[object Array]'` when trying to reverse ethers-returned arrays directly.
- **Status**: Resolved
- **Resolution**: Converted contract results using `Array.from(...)` before reversing or reordering them.
- **Date**: April 2026

### 14. Live Metric Misinterpretation
- **Issue**: After deactivation, the displayed registration count did not change, which caused confusion during testing.
- **Status**: Resolved
- **Resolution**: Clarified that `registrationCount` is a lifetime total and added a separate `Currently Active SIMs` metric derived from audit history.
- **Date**: April 2026

### 15. Hardhat Deployment And Script Issues
- **Issue**: Deployment initially failed because the wrong script name was used, and some commands required elevated execution in the environment.
- **Status**: Resolved
- **Resolution**: Used the correct deploy script (`deploy.cjs`), reran commands with the needed permissions, and confirmed successful local deployment.
- **Date**: April 2026

### 16. Documentation No Longer Matched Final System
- **Issue**: The original documentation did not reflect the final application, especially the multi-SIM flow, admin lifecycle control, and enhanced frontend.
- **Status**: Resolved
- **Resolution**: Rewrote `REPORT.md`, created Word-compatible report files, added a run guide, and prepared a student-role presentation document.
- **Date**: April 2026

## Progress Summary

- Smart contract implemented and updated for multi-SIM support
- Admin-only deactivate/reactivate logic completed
- Frontend wallet integration stabilized
- Hardhat local deployment verified
- Contract tests passing
- Production build of the frontend successful
- Reports and presentation materials prepared

## Next Steps

1. Deploy the smart contract to a public Ethereum testnet such as Sepolia.
2. Move contract address and environment configuration into cleaner production-ready settings.
3. Store network provider information directly on-chain if required in the final scope.
4. Expand automated frontend and end-to-end test coverage.
5. Prepare final presentation walkthrough and demonstration flow.
6. Consider stronger admin authentication beyond frontend-only password gating.

---

*Last Updated: April 5, 2026*

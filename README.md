# Decentralized SIM Registration System

A blockchain-based platform for secure SIM card registration using Ethereum-compatible smart contracts. This system ensures privacy through cryptographic hashing while maintaining transparency and immutability on the blockchain.

## Problem Statement

Traditional SIM registration systems often rely on centralized databases that can be vulnerable to data breaches, manipulation, or single points of failure. This decentralized solution addresses the need for secure, tamper-proof digital identity verification for SIM cards.

## Architecture Overview

### System Components

1. **Smart Contract Layer** (`SIMRegistration.sol`)
   - Ethereum smart contract handling registration logic
   - Stores hashed user data (name, ID, SIM number)
   - Maintains immutable audit trail of registrations
   - Provides verification mechanisms

2. **Frontend Application** (React)
   - User interface for SIM registration
   - MetaMask wallet integration
   - Real-time status checking
   - Responsive web interface

3. **Blockchain Infrastructure**
   - Hardhat development environment
   - Local testing with Hardhat Network
   - Deployment scripts for testnet/mainnet
   - Comprehensive test suite

### Data Flow

```
User Input → Client-side Hashing → Smart Contract → Blockchain Storage
     ↓              ↓                    ↓              ↓
  Name/ID/SIM    Keccak256 Hash      registerSIM()    Event Logging
```

## Smart Contract Design

### Core Functions

- `registerSIM(bytes32 nameHash, bytes32 idHash, bytes32 simHash)`: Registers a new SIM with hashed data
- `isSIMRegistered(bytes32 simHash)`: Checks if a SIM hash is registered
- `getSIMDetails(bytes32 simHash)`: Retrieves registration details
- `getMyRegistration()`: Gets user's registered SIM hash
- `deactivateSIM(bytes32 simHash)`: Deactivates a SIM registration

### Security Measures

1. **Data Privacy**: All sensitive information is hashed client-side using Keccak256
2. **Access Control**: Only registrants can deactivate their own SIMs
3. **Input Validation**: Zero-hash checks prevent invalid registrations
4. **Uniqueness Enforcement**: Prevents duplicate SIM registrations
5. **Event Logging**: All state changes are logged immutably

### Gas Optimization

- Efficient mapping usage for O(1) lookups
- Minimal storage operations
- Event emission for off-chain data retrieval
- View functions for read-only operations

## Blockchain Tools & Infrastructure

### Development Environment
- **Hardhat**: Ethereum development environment
- **ethers.js v6**: Blockchain interaction library
- **MetaMask**: Browser wallet integration

### Testing Framework
- **Hardhat Test Runner**: Unit and integration tests
- **Chai Assertions**: Test validation
- **Hardhat Network**: Local blockchain simulation

### Deployment Pipeline
- Local development network
- Testnet deployment (Sepolia)
- Mainnet deployment capability

## User Interface Features

### Core Functionality
- Wallet connection via MetaMask
- Secure SIM registration form
- Real-time registration status display
- SIM status verification
- Registration deactivation

### User Experience
- Responsive design for mobile/desktop
- Loading states and error handling
- Form validation and user feedback
- Status indicators with color coding

## Installation & Setup

### Prerequisites
- Node.js 16+
- MetaMask browser extension
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd sim-registration-ui
```

2. Install dependencies:
```bash
npm install
```

3. Install Hardhat toolbox:
```bash
npm install --save-dev @nomicfoundation/hardhat-toolbox@hh2
```

### Smart Contract Development

1. Compile contracts:
```bash
npx hardhat compile
```

2. Run tests:
```bash
npx hardhat test
```

3. Deploy locally:
```bash
npx hardhat run scripts/deploy.js
```

### Frontend Development

1. Start development server:
```bash
npm start
```

2. Open [http://localhost:3000](http://localhost:3000) in browser

3. Connect MetaMask to local Hardhat network (if testing locally)

## Usage

### For Users

1. **Connect Wallet**: Click "Connect Wallet" and approve MetaMask connection
2. **Register SIM**: Fill in personal details and SIM number, submit transaction
3. **Check Status**: Use the verification tool to check any SIM's registration status
4. **Manage Registration**: View and deactivate your own registrations

### For Developers

1. **Local Testing**: Use `npx hardhat node` to start local blockchain
2. **Contract Interaction**: Use Hardhat console or deploy scripts
3. **Testing**: Run `npm test` for frontend tests

## Security Considerations

### Smart Contract Security
- Reentrancy protection through state changes before external calls
- Input validation on all public functions
- Access control for sensitive operations
- Gas limit considerations for complex operations

### Frontend Security
- Client-side hashing prevents data exposure
- MetaMask handles private key management
- No sensitive data stored in browser
- HTTPS recommended for production

### Privacy Features
- Zero-knowledge registration (only hashes stored)
- No personal data on blockchain
- User-controlled data access
- Immutable audit trail without compromising privacy

## Testing Strategy

### Unit Tests
- Smart contract function correctness
- Edge case handling
- Gas usage optimization
- Security vulnerability testing

### Integration Tests
- Frontend-backend interaction
- Wallet integration
- Transaction flow validation
- Error handling scenarios

### Manual Testing
- User acceptance testing
- Cross-browser compatibility
- Mobile responsiveness

## Deployment

### Testnet Deployment
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### Production Deployment
1. Update contract address in frontend
2. Configure production environment variables
3. Deploy to mainnet with verified contracts
4. Set up monitoring and alerting

## Future Enhancements

- Multi-network support (Polygon, Arbitrum)
- Batch registration for bulk operations
- Integration with telecom providers
- Mobile app development
- Advanced privacy features (ZK-SNARKs)
- Oracle integration for real-world verification

## Team Roles & Contributions

- **Student 1 - Smart Contracts**: Contract development, security implementation
- **Student 2 - User Interaction & Wallet Integration**: Frontend-backend integration, transaction handling
- **Student 3 - Blockchain Development Tools & Infrastructure**: Hardhat setup, testing framework, deployment
- **Student 4 - User Interface Development**: React components, responsive design, UX optimization

## License

This project is licensed under the MIT License.

## Contact

For questions or contributions, please contact the development team.

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

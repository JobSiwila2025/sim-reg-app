# How to Run

## Prerequisites

- Node.js 16+
- MetaMask browser extension

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Compile & Deploy the Smart Contract

Open **two terminals**.

**Terminal 1** — Start the local blockchain:

```bash
npx hardhat node
```

Keep this running. It will print 20 test accounts with private keys.

**Terminal 2** — Compile and deploy:

```bash
npx hardhat compile
npx hardhat run scripts/deploy.cjs --network localhost
```

The contract will deploy to `0x5FbDB2315678afecb367f032d93F642f64180aa3`.

## Step 3: Start the App

In Terminal 2:

```bash
npm start
```

Open `http://localhost:3000` in your browser.

## MetaMask Setup

1. **Add network**: Settings → Networks → Add → enter:
   - Network Name: `Hardhat`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency: `ETH`

2. **Import test account**: Account icon → Import account → paste a private key from Terminal 1, e.g.:
   ```
   ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```

3. Switch to the **Hardhat** network and the **imported account**, then connect your wallet in the app.

> **Note:** If you restart the Hardhat node, go to MetaMask → Settings → Advanced → **Clear activity tab data** before using the app again.

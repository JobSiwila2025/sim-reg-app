const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Deploying SIM Registration Contract...");

  // Get the ContractFactory and Signers here.
  const SIMRegistration = await ethers.getContractFactory("SIMRegistration");
  const simRegistration = await SIMRegistration.deploy();

  await simRegistration.waitForDeployment();

  const contractAddress = await simRegistration.getAddress();
  console.log("SIM Registration Contract deployed to:", contractAddress);

  // Save the contract address to a file for frontend use
  fs.writeFileSync("contract-address.txt", contractAddress);

  console.log("Contract address saved to contract-address.txt");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SIMRegistration", function () {
  let SIMRegistration;
  let simRegistration;
  let owner;
  let addr1;
  let addr2;
  let addr3;

  const hash = (value) => ethers.keccak256(ethers.toUtf8Bytes(value));

  beforeEach(async function () {
    SIMRegistration = await ethers.getContractFactory("SIMRegistration");
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    simRegistration = await SIMRegistration.deploy();
    await simRegistration.waitForDeployment();
  });

  describe("Registration", function () {
    it("registers a SIM successfully", async function () {
      const simHash = hash("0970000001");

      await expect(simRegistration.connect(addr1).registerSIM(hash("John Doe"), hash("123456789"), simHash))
        .to.emit(simRegistration, "SIMRegistered")
        .withArgs(simHash, addr1.address, (timestamp) => timestamp >= 0);

      expect(await simRegistration.isSIMRegistered(simHash)).to.equal(true);
      expect(await simRegistration.connect(addr1).getMyRegistration()).to.equal(simHash);
    });

    it("prevents duplicate SIM registration across accounts", async function () {
      const simHash = hash("0970000001");

      await simRegistration.connect(addr1).registerSIM(hash("John Doe"), hash("123456789"), simHash);

      await expect(
        simRegistration.connect(addr2).registerSIM(hash("Jane Doe"), hash("987654321"), simHash)
      ).to.be.revertedWith("SIM already registered");
    });

    it("allows one wallet to register multiple SIMs", async function () {
      const firstSIM = hash("0970000001");
      const secondSIM = hash("0960000002");

      await simRegistration.connect(addr1).registerSIM(hash("John Doe"), hash("123456789"), firstSIM);
      await simRegistration.connect(addr1).registerSIM(hash("John Doe"), hash("123456789"), secondSIM);

      const userSIMs = await simRegistration.getUserSIMs(addr1.address);
      expect(userSIMs).to.have.length(2);
      expect(userSIMs[0]).to.equal(firstSIM);
      expect(userSIMs[1]).to.equal(secondSIM);
      expect(await simRegistration.connect(addr1).getMyRegistration()).to.equal(secondSIM);
    });

    it("rejects invalid hashes", async function () {
      await expect(
        simRegistration.registerSIM(ethers.ZeroHash, hash("test"), hash("test"))
      ).to.be.revertedWith("Invalid name hash");

      await expect(
        simRegistration.registerSIM(hash("test"), ethers.ZeroHash, hash("test"))
      ).to.be.revertedWith("Invalid ID hash");

      await expect(
        simRegistration.registerSIM(hash("test"), hash("test"), ethers.ZeroHash)
      ).to.be.revertedWith("Invalid SIM hash");
    });
  });

  describe("SIM Status Management", function () {
    let simHash;

    beforeEach(async function () {
      simHash = hash("0970000001");
      await simRegistration.connect(addr1).registerSIM(hash("John Doe"), hash("123456789"), simHash);
    });

    it("allows only the admin to deactivate a SIM", async function () {
      await expect(simRegistration.deactivateSIM(simHash))
        .to.emit(simRegistration, "SIMStatusUpdated")
        .withArgs(simHash, false, (timestamp) => timestamp >= 0);

      expect(await simRegistration.isSIMRegistered(simHash)).to.equal(false);
    });

    it("prevents non-admin accounts from deactivating a SIM", async function () {
      await expect(
        simRegistration.connect(addr2).deactivateSIM(simHash)
      ).to.be.revertedWith("Only admin can manage SIM status");
    });

    it("allows only the admin to reactivate a SIM", async function () {
      await simRegistration.deactivateSIM(simHash);

      await expect(simRegistration.reactivateSIM(simHash))
        .to.emit(simRegistration, "SIMStatusUpdated")
        .withArgs(simHash, true, (timestamp) => timestamp >= 0);

      expect(await simRegistration.isSIMRegistered(simHash)).to.equal(true);
    });

    it("returns zero when a user has no active SIMs", async function () {
      await simRegistration.deactivateSIM(simHash);
      expect(await simRegistration.connect(addr1).getMyRegistration()).to.equal(ethers.ZeroHash);
    });
  });

  describe("Details And History", function () {
    let simHash;

    beforeEach(async function () {
      simHash = hash("0970000001");
      await simRegistration.connect(addr1).registerSIM(hash("John Doe"), hash("123456789"), simHash);
    });

    it("returns correct SIM details", async function () {
      const details = await simRegistration.getSIMDetails(simHash);

      expect(details.registrant).to.equal(addr1.address);
      expect(details.isActive).to.equal(true);
      expect(details.timestamp).to.be.a("bigint");
    });

    it("records user history for admin actions", async function () {
      await simRegistration.deactivateSIM(simHash);
      await simRegistration.reactivateSIM(simHash);

      const history = await simRegistration.getUserHistory(addr1.address);
      expect(history).to.have.length(3);
      expect(Number(history[0].action)).to.equal(0);
      expect(Number(history[1].action)).to.equal(1);
      expect(Number(history[2].action)).to.equal(2);
    });

    it("stores the deployer as admin", async function () {
      expect(await simRegistration.admin()).to.equal(owner.address);
    });
  });

  describe("Gas Optimization", function () {
    it("keeps registration gas reasonable", async function () {
      const tx = await simRegistration.registerSIM(hash("Test User"), hash("123456"), hash("0970000001"));
      const receipt = await tx.wait();

      expect(receipt.gasUsed).to.be.lt(500000n);
    });
  });
});

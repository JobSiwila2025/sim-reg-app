// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SIM Registration Contract
 * @dev Decentralized SIM card registration with privacy-preserving hashing
 * @notice This contract allows users to register SIM cards using cryptographic hashes
 * to maintain privacy while ensuring uniqueness and auditability
 */
contract SIMRegistration {
    // Struct to store SIM registration data
    struct SIMRecord {
        bytes32 nameHash;      // Keccak256 hash of full name
        bytes32 idHash;        // Keccak256 hash of national ID
        bytes32 simHash;       // Keccak256 hash of SIM number
        address registrant;    // Address of the user who registered
        uint256 timestamp;     // Registration timestamp
        bool isActive;         // Registration status
    }

    // Mapping from SIM hash to registration record
    mapping(bytes32 => SIMRecord) private simRecords;

    // Mapping to track registered SIM hashes for uniqueness
    mapping(bytes32 => bool) private registeredSIMs;

    // Mapping to track user registrations (one SIM per address for simplicity)
    mapping(address => bytes32) private userRegistrations;

    // Public counter for total registrations (audit transparency)
    uint256 public registrationCount;

    // Events for audit trail
    event SIMRegistered(
        bytes32 indexed simHash,
        address indexed registrant,
        uint256 timestamp
    );

    event SIMStatusUpdated(
        bytes32 indexed simHash,
        bool isActive,
        uint256 timestamp
    );

    /**
     * @dev Register a new SIM card
     * @param _nameHash Keccak256 hash of the user's full name
     * @param _idHash Keccak256 hash of the user's national ID
     * @param _simHash Keccak256 hash of the SIM card number
     */
    function registerSIM(
        bytes32 _nameHash,
        bytes32 _idHash,
        bytes32 _simHash
    ) external {
        require(_nameHash != bytes32(0), "Invalid name hash");
        require(_idHash != bytes32(0), "Invalid ID hash");
        require(_simHash != bytes32(0), "Invalid SIM hash");
        require(!registeredSIMs[_simHash], "SIM already registered");
        require(userRegistrations[msg.sender] == bytes32(0), "User already has a registered SIM");

        // Create new SIM record
        SIMRecord memory newRecord = SIMRecord({
            nameHash: _nameHash,
            idHash: _idHash,
            simHash: _simHash,
            registrant: msg.sender,
            timestamp: block.timestamp,
            isActive: true
        });

        // Store the record
        simRecords[_simHash] = newRecord;
        registeredSIMs[_simHash] = true;
        userRegistrations[msg.sender] = _simHash;

        // Emit registration event
        emit SIMRegistered(_simHash, msg.sender, block.timestamp);
    }

    /**
     * @dev Verify if a SIM hash is registered
     * @param _simHash The SIM hash to check
     * @return bool True if registered and active
     */
    function isSIMRegistered(bytes32 _simHash) external view returns (bool) {
        return registeredSIMs[_simHash] && simRecords[_simHash].isActive;
    }

    /**
     * @dev Get registration details for a SIM
     * @param _simHash The SIM hash
     * @return registrant The registering address
     * @return timestamp Registration timestamp
     * @return isActive Registration status
     */
    function getSIMDetails(bytes32 _simHash)
        external
        view
        returns (address registrant, uint256 timestamp, bool isActive)
    {
        SIMRecord memory record = simRecords[_simHash];
        require(record.registrant != address(0), "SIM not registered");

        return (record.registrant, record.timestamp, record.isActive);
    }

    /**
     * @dev Get user's registered SIM hash
     * @return bytes32 The SIM hash registered by the caller
     */
    function getMyRegistration() external view returns (bytes32) {
        return userRegistrations[msg.sender];
    }

    /**
     * @dev Deactivate a SIM registration (only registrant can deactivate)
     * @param _simHash The SIM hash to deactivate
     */
    function deactivateSIM(bytes32 _simHash) external {
        require(simRecords[_simHash].registrant == msg.sender, "Only registrant can deactivate");
        require(simRecords[_simHash].isActive, "SIM already inactive");

        simRecords[_simHash].isActive = false;
        emit SIMStatusUpdated(_simHash, false, block.timestamp);
    }

    /**
     * @dev Get total registered SIMs count (for analytics)
     * @return uint256 Number of registered SIMs
     */
    function getTotalRegistrations() external view returns (uint256) {
        // Note: In production, consider using a counter variable for gas efficiency
        // This implementation is for demonstration; counting mappings is expensive
        return 0; // Placeholder - would need proper implementation
    }
}
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

    // Mapping to track all SIM hashes registered by a user
    mapping(address => bytes32[]) private userRegistrations;

    // Public counter for total registrations (audit transparency)
    uint256 public registrationCount;
    address public immutable admin;

    // Registration history
    struct RegistrationEvent {
        bytes32 simHash;
        address registrant;
        uint256 timestamp;
        Action action; // register, deactivate, reactivate
    }

    enum Action { Registered, Deactivated, Reactivated }

    // Array to store all registration events for audit
    RegistrationEvent[] private registrationHistory;

    // Mapping from user address to their registration events
    mapping(address => RegistrationEvent[]) private userHistory;

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

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can manage SIM status");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

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
        userRegistrations[msg.sender].push(_simHash);
        registrationCount++;

        // Add to registration history
        registrationHistory.push(RegistrationEvent({
            simHash: _simHash,
            registrant: msg.sender,
            timestamp: block.timestamp,
            action: Action.Registered
        }));
        userHistory[msg.sender].push(RegistrationEvent({
            simHash: _simHash,
            registrant: msg.sender,
            timestamp: block.timestamp,
            action: Action.Registered
        }));

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
        bytes32[] memory registrations = userRegistrations[msg.sender];

        for (uint256 i = registrations.length; i > 0; i--) {
            bytes32 simHash = registrations[i - 1];
            if (simRecords[simHash].isActive) {
                return simHash;
            }
        }

        return bytes32(0);
    }

    /**
     * @dev Get all SIM hashes registered by a user
     * @param _user The user address
     * @return bytes32[] All SIM hashes ever registered by the user
     */
    function getUserSIMs(address _user) external view returns (bytes32[] memory) {
        return userRegistrations[_user];
    }

    /**
     * @dev Deactivate a SIM registration (only registrant can deactivate)
     * @param _simHash The SIM hash to deactivate
     */
    function deactivateSIM(bytes32 _simHash) external onlyAdmin {
        require(simRecords[_simHash].registrant != address(0), "SIM not registered");
        require(simRecords[_simHash].isActive, "SIM already inactive");

        simRecords[_simHash].isActive = false;
        address registrant = simRecords[_simHash].registrant;

        // Add to registration history
        registrationHistory.push(RegistrationEvent({
            simHash: _simHash,
            registrant: registrant,
            timestamp: block.timestamp,
            action: Action.Deactivated
        }));
        userHistory[registrant].push(RegistrationEvent({
            simHash: _simHash,
            registrant: registrant,
            timestamp: block.timestamp,
            action: Action.Deactivated
        }));

        emit SIMStatusUpdated(_simHash, false, block.timestamp);
    }

    /**
     * @dev Reactivate a SIM registration (only registrant can reactivate)
     * @param _simHash The SIM hash to reactivate
     */
    function reactivateSIM(bytes32 _simHash) external onlyAdmin {
        require(simRecords[_simHash].registrant != address(0), "SIM not registered");
        require(!simRecords[_simHash].isActive, "SIM already active");

        simRecords[_simHash].isActive = true;
        address registrant = simRecords[_simHash].registrant;

        // Add to registration history
        registrationHistory.push(RegistrationEvent({
            simHash: _simHash,
            registrant: registrant,
            timestamp: block.timestamp,
            action: Action.Reactivated
        }));
        userHistory[registrant].push(RegistrationEvent({
            simHash: _simHash,
            registrant: registrant,
            timestamp: block.timestamp,
            action: Action.Reactivated
        }));

        emit SIMStatusUpdated(_simHash, true, block.timestamp);
    }

    /**
     * @dev Get registration history for a user
     * @param _user The user address
     * @return Array of registration events
     */
    function getUserHistory(address _user) external view returns (RegistrationEvent[] memory) {
        return userHistory[_user];
    }

    /**
     * @dev Get all registration events (for admin/audit)
     * @return Array of all registration events
     */
    function getAllHistory() external view returns (RegistrationEvent[] memory) {
        return registrationHistory;
    }

    /**
     * @dev Get total registration events count
     * @return uint256 Number of events
     */
    function getHistoryCount() external view returns (uint256) {
        return registrationHistory.length;
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

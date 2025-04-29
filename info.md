# Dexponent Protocol: Farm Creation Workflow

This document outlines the detailed workflow for creating a new Farm (DeFi Strategy) within the Dexponent Protocol, involving user interaction, backend processing, and on-chain contract deployments.

## Prerequisites

1.  **User/Creator Wallet:** The user wishing to create a farm has a funded wallet address (`creatorAddress`).
2.  **Creator Approval:** The `creatorAddress` must be approved by the protocol admin/owner by calling `setApprovedFarmOwner(creatorAddress, true)` on the `ProtocolFarmCreation` contract. This is likely done via an internal admin process triggering the `approve-farm-owner-listener.ts` script.
3.  **Backend Wallet:** The backend service has access to a configured, funded wallet (`backendDeployerWallet`) that has the necessary permissions (either it is the `owner()` of `ProtocolFarmCreation` or can impersonate it if allowed) to eventually call `setPool` and `setLiquidityManager`.
4.  **Configuration (Backend):**
    *   Network RPC Endpoint (e.g., Sepolia)
    *   `ProtocolFarmCreation` contract address.
    *   `DXPToken` address (Sepolia).
    *   Uniswap V3 Factory address (Sepolia): `0x0227628f3F023bb0B980b67D528571c95c6DaC1c`
    *   `LiquidityManager` address (Sepolia): `0x865B93Ea0999e1d910240657Cf12BD43Fc34E11e`
    *   IPFS API endpoint/gateway.
    *   Database connection details.
    *   Private key for `backendDeployerWallet` (stored securely).

## Workflow Steps

### Step 1: Farm Creation Request (UI -> Backend)

*   **Action:** A pre-approved user submits the details for their desired farm via a frontend interface.
*   **Endpoint:** `POST /api/v1/farms/requests`
*   **Authentication:** Requires user authentication (e.g., wallet signature) to identify the `creatorAddress`.
*   **Request Body (JSON):**
    ```json
    {
      "farmName": "My Awesome ETH Yield Farm",
      "farmDescription": "Leveraged staking strategy for ETH with auto-compounding.",
      "farmLogoUrl": "ipfs://Qm... or https://...", // Optional URL or placeholder for later upload
      "principalAssetAddress": "0x...", // e.g., WETH address on Sepolia
      
      // --- Choose ONE of the following strategy definition methods: ---
      "strategyType": "RESTAKE", // Method 1: Select a predefined template (e.g., "RESTAKE", "UNIV3_LP", "AAVE_LEND"). Set strategyContractAddress to null.
      "strategyContractAddress": null, // Address for Method 1 is null.
      
      // --- OR ---
      // "strategyType": "CUSTOM", // Method 2: Indicate a custom, pre-deployed strategy.
      // "strategyContractAddress": "0xabc123...", // Method 2: Provide the address of YOUR pre-deployed strategy contract. It MUST conform to the Dexponent FarmStrategy interface.
      // -----------------------------------------------------------------
      
      "parameters": { // Strategy-specific parameters. For templates, these configure the template. For CUSTOM, may be unused or used for linking if Farm supports it.
        "targetAPY": "15", // Example: Target APY in %
        "lockupPeriodDays": 90, // Example lockup
        "customParam1": "value1" // Other params as needed by the specific strategyType or CUSTOM contract
      },
      "incentiveSplits": {
        "lp": 70, // Percentage for Liquidity Providers
        "verifier": 30, // Percentage for Verifiers
        "yieldYoda": 0 // Percentage for Yield Yodas
      },
      "maturityPeriodDays": 30, // Reference maturity period
      "claimToken": {
        "name": "MyFarm LP Token", // Name for the Farm's LP/Claim token
        "symbol": "MYFARM-LP" // Symbol for the Farm's LP/Claim token
      },
      "creatorMetadata": { // Optional extra metadata
         "website": "https://myfarm.xyz",
         "docs": "https://docs.myfarm.xyz",
         "social": {"twitter": "@MyFarmXYZ"}
      }
    }
    ```

### Step 2: Backend Request Processing

*   **Action:** The backend API receives the request.
*   **Validation:**
    *   Check if `creatorAddress` (from auth) is approved via `approvedFarmOwners` mapping on `ProtocolFarmCreation` contract (read call).
    *   Validate `principalAssetAddress` (is it a valid ERC20?).
    *   Ensure `incentiveSplits` sum to 100.
    *   Validate that EITHER `strategyType` (and is a known template type) OR `strategyContractAddress` (and is a valid address) is provided, but not both simultaneously (unless `strategyType` is "CUSTOM").
    *   Validate other parameters based on `strategyType`.
*   **Metadata Handling:**
    *   If `farmLogoUrl` needs uploading, upload it to IPFS.
    *   Consolidate all descriptive metadata (`farmName`, `farmDescription`, `farmLogoUrl`, `creatorMetadata`, etc.) into a JSON object.
    *   Upload this metadata JSON to IPFS, get the `metadataIpfsHash`.
*   **Database:**
    *   Store the request details, `creatorAddress`, `metadataIpfsHash`, and calculated parameters in a database table (e.g., `farm_requests`).
    *   Set initial status to `PENDING_DEPLOYMENT`.
*   **Response:** Return the unique `requestId` to the UI.
    ```json
    {
      "requestId": "req_12345abcde"
    }
    ```

### Step 3: Deployment Trigger (Manual/Admin or Automated)

*   **Action:** An authorized process (e.g., an admin clicking 'Deploy' in a dashboard, or an automated queue processor) triggers the deployment for an approved request.
*   **Endpoint:** `GET /api/v1/farms/deploy/{requestId}`
*   **Authentication:** Requires admin/backend credentials.

### Step 4: Backend Deployment Processing

*   **Action:** The backend service handles the on-chain deployments.
*   **Retrieve Request:** Fetch request details from the database using `requestId`.
*   **Generate Salt:** Create a unique `bytes32` salt for deterministic deployment (e.g., `keccak256(abi.encodePacked(creatorAddress, requestId))` ).
*   **4*. Determine Strategy Address:**
    *   Initialize `strategyAddressToUse` variable.
    *   **If `strategyType` is a template (e.g., "RESTAKE", "UNIV3_LP"):**
        *   Identify the bytecode/factory for the chosen template.
        *   Deploy an instance of the strategy template contract using ethers.js/viem, passing necessary configuration from the request `parameters`.
        *   Wait for the transaction receipt and get the deployed template instance address.
        *   Set `strategyAddressToUse` = deployed template instance address.
        *   Update DB: Store deployed template strategy address (optional). Status: `STRATEGY_DEPLOYED`.
    *   **Else If `strategyType` is "CUSTOM" and `strategyContractAddress` is provided:**
        *   Validate the provided `strategyContractAddress` (e.g., check if it has code).
        *   Set `strategyAddressToUse` = `strategyContractAddress` from the request.
        *   Status remains `PENDING_DEPLOYMENT` (as strategy was pre-deployed).
    *   **Else:** Handle error (invalid strategy definition).
*   **4a. Deploy Farm Contract:**
    *   Use ethers.js/viem with `backendDeployerWallet`.
    *   Get the `ProtocolFarmCreation` contract instance.
    *   Call `protocolFarmCreation.createFarm()` with:
        *   `salt`: Generated salt.
        *   `asset`: `principalAssetAddress` from the request.
        *   `maturityPeriod`: `maturityPeriodDays * 1 days`.
        *   `verifierIncentiveSplit`, `yieldYodaIncentiveSplit`, `lpIncentiveSplit`: From request.
        *   `strategy`: **`strategyAddressToUse`** (determined in the previous step).
        *   `claimName`, `claimSymbol`: From request.
    *   Wait for the transaction receipt.
    *   Extract `farmId` and `farmAddr` from the `FarmCreated` event logs.
    *   Update DB: Store `farmId`, `farmAddr`, set status to `FARM_DEPLOYED`.
*   **4b. Deploy Uniswap V3 Pool:**
    *   Get the Uniswap V3 Factory instance (`0x0227628f3F023bb0B980b67D528571c95c6DaC1c`).
    *   Determine the fee tier (e.g., 3000 for 0.3% - needs to be decided/configurable).
    *   Call `uniswapV3Factory.createPool(dxpTokenAddress, principalAssetAddress, feeTier)`.
    *   Wait for the transaction receipt.
    *   Extract the `poolAddr` from the `PoolCreated` event logs.
    *   Update DB: Store `poolAddr`, set status to `POOL_DEPLOYED`.
*   **4c. Link Farm, Pool, and Liquidity Manager:**
    *   Get the deployed `Farm` contract instance at `farmAddr`.
    *   Get the configured `LiquidityManager` address (`0x865B93Ea0999e1d910240657Cf12BD43Fc34E11e`).
    *   **Using `backendDeployerWallet` (acting with `protocolMaster`/`owner()` privileges):**
        *   Call `farmContract.setPool(poolAddr)`.
        *   Wait for tx confirmation.
        *   Call `farmContract.setLiquidityManager(liquidityManagerAddress)`.
        *   Wait for tx confirmation.
    *   Update DB: Set status to `READY` or `AWAITING_VERIFICATION`.
*   **Response:** Return success indication.
    ```json
    {
      "status": "success",
      "farmId": "0x...",
      "farmAddress": "0x...",
      "poolAddress": "0x..."
    }
    ```

### Step 5: Post-Deployment

*   The farm contract is deployed, the DXP/Asset pool exists, and they are linked via the Farm contract and the Liquidity Manager.
*   The farm is technically functional but may not yet be visible or trusted by end-users.
*   **Next Phases (Out of Scope for this Workflow):**
    *   **Verification:** The Consensus Module interacts with the farm for validation.
    *   **Curation/Listing:** The farm might need further off-chain approval to be listed prominently in the main UI.
    *   **Monitoring:** Backend services monitor farm health and performance.

---
This workflow provides a detailed plan for integrating user requests with backend logic and on-chain actions to enable permissioned (initially) farm creation in the Dexponent Protocol.

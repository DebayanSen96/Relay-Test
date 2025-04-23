# Farm Deployment Service

A Node.js application with TypeScript that handles farm creation requests, deploys smart contracts on the blockchain, and listens for contract events based on the Dexponent Protocol.

## Features

- REST API for farm creation requests
- Smart contract deployment for farm strategies
- Uniswap V3 pool creation
- Event listening for deployed contracts
- IPFS metadata storage

## Prerequisites

- Node.js (v14+)
- PostgreSQL
- Ethereum wallet with funds (for contract deployment)
- Infura or other RPC provider account

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the values in `.env` with your own configuration

```bash
cp .env.example .env
```

4. Create the PostgreSQL database:

```bash
createdb farm_deployment
```

## Usage

### Development

Start the development server:

```bash
npm run dev
```

### Production

Build the application:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## API Endpoints

### Create Farm Request

```
POST /api/v1/farms/requests
```

Request body example:

```json
{
  "farmName": "My Awesome ETH Yield Farm",
  "farmDescription": "Leveraged staking strategy for ETH with auto-compounding.",
  "farmLogoUrl": "ipfs://Qm...",
  "principalAssetAddress": "0x...",
  "strategyType": "RESTAKE",
  "strategyContractAddress": null,
  "parameters": {
    "targetAPY": "15",
    "lockupPeriodDays": 90
  },
  "incentiveSplits": {
    "lp": 70,
    "verifier": 30,
    "yieldYoda": 0
  },
  "maturityPeriodDays": 30,
  "claimToken": {
    "name": "MyFarm LP Token",
    "symbol": "MYFARM-LP"
  },
  "creatorMetadata": {
    "website": "https://myfarm.xyz",
    "docs": "https://docs.myfarm.xyz",
    "social": {"twitter": "@MyFarmXYZ"}
  }
}
```

### Deploy Farm

```
POST /api/v1/farms/deploy/:requestId
```

### Get Farm Request

```
GET /api/v1/farms/requests/:requestId
```

## Architecture

The application follows a layered architecture:

- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic
- **Models**: Define data structures
- **Routes**: Define API endpoints
- **Middlewares**: Handle cross-cutting concerns

## Smart Contract Interaction

The application interacts with the following smart contracts:

- **ProtocolFarmCreation**: Creates new farm contracts
- **Farm**: Manages the farm's operations
- **UniswapV3Factory**: Creates liquidity pools
- **Strategy**: Implements the farm's investment strategy

## Event Listening

The application listens for events from deployed farm contracts, such as:

- **PoolSet**: When a pool is set for a farm
- **LiquidityManagerSet**: When a liquidity manager is set for a farm

## License

MIT

import { HardhatUserConfig, vars } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import ("@nomicfoundation/hardhat-ignition");

const config: HardhatUserConfig = {
  solidity: "0.8.0",
};

const PRIVATE_KEY = vars.get("PRIVATE_KEY");

const ETHERSCAN_API_KEY = vars.get("ETHERSCAN_API_KEY");

const BSCSCAN_API_KEY = vars.get("BSCSCAN_API_KEY");

module.exports = {
  solidity: "0.8.20",
  networks: {
    eth: {
      url: `https://mainnet.infura.io/v3/1bab6c4b35ab40bea7afc9518acf11a9`,
      accounts: [PRIVATE_KEY],
    },
    oasistestnet: {
      url: `https://testnet.sapphire.oasis.io`,
      accounts: [PRIVATE_KEY],
    },
  starknettest: {
    url: `https://starknet-mainnet.g.alchemy.com/v2/demo`,
    accounts: [PRIVATE_KEY],
  },
  lineatestnet: {
    url: `https://rpc.sepolia.linea.build	`,
    accounts: [PRIVATE_KEY],
  },
},
  etherscan: {
    apiKey: {
      bsc: BSCSCAN_API_KEY,
    },
  },
  sourcify: {
    enabled: true
  }
};

export default config;

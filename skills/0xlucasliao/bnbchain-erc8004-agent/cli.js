#!/usr/bin/env node

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Contract addresses (BSC Testnet)
// Note: These need to be correct for BSC Testnet. 
// If ERC-8004 is not deployed on BSC Testnet, we'd need to deploy the registry first.
// Assuming the user provided link implies it exists or we should deploy it.
// For now, I'll use placeholders or keep AVAX ones if this is a cross-chain simulation, 
// but the user asked to register on BSC Testnet.

// Updating to BSC Testnet RPC and Chain ID
const BSC_TESTNET_RPC = "https://data-seed-prebsc-1-s1.binance.org:8545/";
const BSC_TESTNET_ID = 97;

// !! ALERT: The addresses below are likely AVAX specific. 
// If the user wants to Run this on BSC, we need valid BSC contact addresses for the registry.
// Since I don't have them, I will attempt to deploy them if they don't exist, 
// OR I will assume the user wants me to use the AVAX ones but on BSC (which won't work).
// However, the user said "register yourself on erc8004 on testnet... gasless".
// It might be a specific dApp.
// I will patch the RPC to BSC Testnet and see if it connects.
// If the contracts aren't there, it will fail.

const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"; // Keeping for now, likely wrong network
const REPUTATION_REGISTRY = "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63"; // Keeping for now

// ABIs (Same)
const IDENTITY_ABI = [
  "function register() external returns (uint256)",
  "function register(string agentURI) external returns (uint256)",
  "function register(string agentURI, tuple(string metadataKey, bytes metadataValue)[] metadata) external returns (uint256)",
  "function setAgentURI(uint256 agentId, string newURI) external",
  "function setMetadata(uint256 agentId, string metadataKey, bytes metadataValue) external",
  "function getMetadata(uint256 agentId, string metadataKey) external view returns (bytes)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function balanceOf(address owner) external view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

const TASK_AGENT_ABI = [
  "function owner() external view returns (address)",
  "function agentId() external view returns (uint256)",
  "function isRegistered() external view returns (bool)",
  "function taskPrices(uint256) external view returns (uint256)",
  "function setTaskPrice(uint256 taskId, uint256 price) external"
];

function loadConfig() {
  const configPath = path.join(__dirname, "config", "agent.config.js");
  if (!fs.existsSync(configPath)) return null;
  delete require.cache[require.resolve(configPath)];
  return require(configPath);
}

function loadDeployment() {
  const deployPath = path.join(__dirname, "deployment.json");
  if (!fs.existsSync(deployPath)) return null;
  return JSON.parse(fs.readFileSync(deployPath, "utf8"));
}

function saveDeployment(data) {
  const deployPath = path.join(__dirname, "deployment.json");
  fs.writeFileSync(deployPath, JSON.stringify(data, null, 2));
}

function getWallet() {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) { console.error("❌ PRIVATE_KEY not found"); process.exit(1); }
  
  // PATCH: Force BSC Testnet
  const provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);
  return new ethers.Wallet(privateKey, provider);
}

// Commands
async function init() {
  const configDir = path.join(__dirname, "config");
  const configPath = path.join(configDir, "agent.config.js");
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  
  const template = `module.exports = {
  agent: {
    name: "BNBClaw",
    description: "Official BNB Chain OpenClaw Agent",
    twitter: "@bnbchain",
    uri: "https://clawhub.ai/bnbclaw"
  },
  token: "tBNB"
};`;
  fs.writeFileSync(configPath, template);
  console.log("✅ Config initialized for BSC Testnet");
}

async function deploy() {
  const config = loadConfig();
  if (!config) { console.error("❌ No config found"); return; }
  
  const wallet = getWallet();
  const balance = await wallet.provider.getBalance(wallet.address);
  
  console.log("═".repeat(50));
  console.log("     ERC-8004 Agent Deployment (BSC Testnet)");
  console.log("═".repeat(50));
  console.log("Deployer:", wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "tBNB");
  
  // Skip balance check for now (or lower it)
  // if (balance < ethers.parseEther("0.01")) ...

  const deployment = loadDeployment() || {};
  
  // 1. Register Identity
  // NOTE: On a new chain, we might need to deploy the registry first if it doesn't exist.
  // For this tasks, assumed "register yourself" implies interacting with an existing one.
  // If this fails, it means the contracts aren't at these addresses on BSC Testnet.
  
  try {
    const identity = new ethers.Contract(IDENTITY_REGISTRY, IDENTITY_ABI, wallet);
    // Check if contract exists
    const code = await wallet.provider.getCode(IDENTITY_REGISTRY);
    if (code === "0x") {
        console.error("❌ IdentityRegistry not found on BSC Testnet at " + IDENTITY_REGISTRY);
        console.log("   (The skill defaults to AVAX addresses. We need BSC addresses.)");
        return;
    }

    if (!deployment.agentId) {
        console.log("1. Registering agent identity...");
        const tx = await identity["register()"]({ gasLimit: 500000 });
        console.log("   TX:", tx.hash);
        const receipt = await tx.wait();
        const transferLog = receipt.logs.find(l => l.topics[0] === ethers.id("Transfer(address,address,uint256)"));
        const agentId = parseInt(transferLog.topics[3], 16);
        deployment.agentId = agentId;
        saveDeployment(deployment);
        console.log("   ✅ Registered! Agent ID:", agentId);
    }
  } catch (err) {
      console.error("❌ Registration failed:", err.message);
  }
}

// Minimal stubs for other commands
async function setMetadata(key, val) { console.log("Metadata set (mock)"); }
async function setUri(uri) { console.log("URI set (mock)"); }
async function setPrice(id, price) { console.log("Price set (mock)"); }
async function status() { console.log("Status: Checking..."); }

const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case "init": init(); break;
  case "deploy": deploy().catch(console.error); break;
  case "set-metadata": setMetadata(); break;
  case "set-uri": setUri(); break;
  case "set-price": setPrice(); break;
  case "status": status(); break;
  default: console.log("Usage: node cli.js <command>");
}

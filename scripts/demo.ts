import * as fs from "fs";
import * as path from "path";
import {
  createPublicClient,
  http,
  formatUnits,
  type Address,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/**
 * Testnet definitions.  We try Alfajores first (the address the task specifies),
 * then fall back to Celo Sepolia which replaced Alfajores in late 2025.
 */
interface TestnetOption {
  name: string;
  chainId: number;
  rpcs: string[];
  chain: Chain;
  cusd: Address;
}

const TESTNETS: TestnetOption[] = [
  {
    name: "Celo Alfajores",
    chainId: 44787,
    rpcs: [
      "https://alfajores-forno.celo-testnet.org",
      "https://celo-alfajores-rpc.allthatnode.com",
    ],
    chain: {
      id: 44787,
      name: "Celo Alfajores",
      nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
      rpcUrls: { default: { http: ["https://alfajores-forno.celo-testnet.org"] } },
      blockExplorers: { default: { name: "Celoscan Alfajores", url: "https://alfajores.celoscan.io" } },
      testnet: true,
    },
    cusd: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1" as Address,
  },
  {
    name: "Celo Sepolia",
    chainId: 11142220,
    rpcs: ["https://forno.celo-sepolia.celo-testnet.org"],
    chain: {
      id: 11142220,
      name: "Celo Sepolia",
      nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
      rpcUrls: { default: { http: ["https://forno.celo-sepolia.celo-testnet.org"] } },
      blockExplorers: { default: { name: "Blockscout", url: "https://celo-sepolia.blockscout.com" } },
      testnet: true,
    },
    cusd: "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b" as Address,
  },
];

/** Parse .env file without external dependencies. */
function loadEnvFile(): Record<string, string> {
  const envPath = path.resolve(__dirname, "../.env");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env file not found — copy .env.example to .env first");
  }
  const vars: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    vars[key] = val;
  }
  return vars;
}

async function main(): Promise<void> {
  console.log("🟡 Celo Testnet On-Chain Demo\n");

  // --- Wallet from .env ---
  const env = loadEnvFile();
  const rawKey = env.PRIVATE_KEY;
  if (!rawKey) throw new Error("PRIVATE_KEY not found in .env");
  const privateKey = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;
  const account = privateKeyToAccount(privateKey);
  const wallet = account.address;

  console.log(`Wallet: ${wallet}\n`);

  // --- Connect: try Alfajores RPCs first, then Celo Sepolia fallback ---
  let client: ReturnType<typeof createPublicClient> | undefined;
  let usedRpc = "";
  let usedNet: TestnetOption | undefined;

  for (const net of TESTNETS) {
    for (const rpc of net.rpcs) {
      try {
        const c = createPublicClient({ chain: net.chain, transport: http(rpc) });
        await c.getBlockNumber();
        client = c;
        usedRpc = rpc;
        usedNet = net;
        break;
      } catch {
        console.warn(`⚠ ${net.name} RPC ${rpc} unavailable, trying next…`);
      }
    }
    if (client) break;
  }

  if (!client || !usedNet) {
    throw new Error("All testnet RPCs failed — check network connectivity");
  }

  console.log(`Network: ${usedNet.name} (chain ${usedNet.chainId})`);
  console.log(`RPC:     ${usedRpc}\n`);

  // --- Latest block ---
  const blockNumber = await client.getBlockNumber();
  const block = await client.getBlock({ blockNumber });
  const blockTimestamp = new Date(Number(block.timestamp) * 1000).toISOString();

  console.log(`Block #${blockNumber} — ${blockTimestamp}\n`);

  // --- Balances ---
  const [celoWei, cusdWei] = await Promise.all([
    client.getBalance({ address: wallet }),
    client.readContract({
      address: usedNet.cusd,
      abi: ERC20_BALANCE_ABI,
      functionName: "balanceOf",
      args: [wallet],
    }),
  ]);

  const celoBalance = formatUnits(celoWei, 18);
  const cusdBalance = formatUnits(cusdWei as bigint, 18);

  console.log("Balances:");
  console.log(`  CELO:  ${celoBalance}`);
  console.log(`  cUSD:  ${cusdBalance}\n`);

  // --- Save proof ---
  const proof = {
    timestamp: new Date().toISOString(),
    network: usedNet.name,
    chainId: usedNet.chainId,
    rpc: usedRpc,
    wallet,
    blockNumber: blockNumber.toString(),
    blockTimestamp,
    balances: {
      CELO: celoBalance,
      cUSD: cusdBalance,
    },
    contracts: {
      cUSD: usedNet.cusd,
    },
  };

  const proofDir = path.resolve(__dirname, "../proof");
  if (!fs.existsSync(proofDir)) {
    fs.mkdirSync(proofDir, { recursive: true });
  }
  const proofPath = path.join(proofDir, "demo.json");
  fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2) + "\n");

  console.log("✅ Proof saved to proof/demo.json");
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((err) => {
  console.error("Demo failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

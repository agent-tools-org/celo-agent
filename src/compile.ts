import * as fs from "fs";
import * as path from "path";
import solc from "solc";

const CONTRACT_NAME = "CeloPaymentLog";
const SOL_PATH = path.resolve(__dirname, "..", "contracts", `${CONTRACT_NAME}.sol`);
const ARTIFACTS_DIR = path.resolve(__dirname, "..", "artifacts");
const OUTPUT_PATH = path.join(ARTIFACTS_DIR, `${CONTRACT_NAME}.json`);

export function compile(): { abi: unknown[]; bytecode: string } {
  const source = fs.readFileSync(SOL_PATH, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      [`${CONTRACT_NAME}.sol`]: { content: source },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const fatal = output.errors.filter((e: { severity: string }) => e.severity === "error");
    if (fatal.length > 0) {
      throw new Error(
        `Solidity compilation errors:\n${fatal.map((e: { formattedMessage: string }) => e.formattedMessage).join("\n")}`,
      );
    }
  }

  const contract = output.contracts[`${CONTRACT_NAME}.sol`][CONTRACT_NAME];
  const abi = contract.abi;
  const bytecode: string = contract.evm.bytecode.object;

  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const artifact = { abi, bytecode };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(artifact, null, 2));

  return artifact;
}

/* Run when invoked directly */
if (require.main === module) {
  const { abi, bytecode } = compile();
  console.log(`Compiled ${CONTRACT_NAME}: ${abi.length} ABI entries, bytecode ${bytecode.length} chars`);
  console.log(`Artifact written to ${OUTPUT_PATH}`);
}

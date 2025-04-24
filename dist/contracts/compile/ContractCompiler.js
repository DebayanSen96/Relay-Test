"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractCompiler = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const solc_1 = __importDefault(require("solc"));
class ContractCompiler {
    /**
     * Compiles a Solidity contract file
     * @param contractPath Path to the Solidity contract file
     * @returns Compiled contract output
     */
    static compileContract(contractPath) {
        // Read the contract source code
        const contractSource = fs_1.default.readFileSync(contractPath, 'utf8');
        // Prepare input for solc compiler
        const input = {
            language: 'Solidity',
            sources: {
                [path_1.default.basename(contractPath)]: {
                    content: contractSource
                }
            },
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                },
                viaIR: true,
                outputSelection: {
                    '*': {
                        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode']
                    }
                }
            }
        };
        console.log(`Compiling contract: ${path_1.default.basename(contractPath)}`);
        // Callback to resolve imports, e.g., OpenZeppelin contracts
        const findImports = (importPath) => {
            try {
                const resolvedPath = importPath.startsWith('.')
                    ? path_1.default.resolve(path_1.default.dirname(contractPath), importPath)
                    : path_1.default.resolve(process.cwd(), 'node_modules', importPath);
                const contents = fs_1.default.readFileSync(resolvedPath, 'utf8');
                return { contents };
            }
            catch (err) {
                return { error: `Unable to import "${importPath}": ${err.message}` };
            }
        };
        // Compile the contract using standard JSON input with import callback
        const output = JSON.parse(solc_1.default.compile(JSON.stringify(input), { import: findImports }));
        // Check for errors
        if (output.errors) {
            const errors = output.errors.filter((error) => error.severity === 'error');
            if (errors.length > 0) {
                throw new Error(`Compilation errors: ${JSON.stringify(errors)}`);
            }
            // Log warnings
            const warnings = output.errors.filter((error) => error.severity === 'warning');
            if (warnings.length > 0) {
                console.warn(`Compilation warnings: ${JSON.stringify(warnings)}`);
            }
        }
        // Return the compiled output
        return output;
    }
    /**
     * Gets the ABI and bytecode for a specific contract from compiled output
     * @param compiledOutput Compiled contract output
     * @param contractName Name of the contract
     * @returns ABI and bytecode for the contract
     */
    static getContract(compiledOutput, contractName) {
        // Find the file in compiled output that contains the contract
        let contract;
        for (const fileName of Object.keys(compiledOutput.contracts)) {
            if (compiledOutput.contracts[fileName]?.[contractName]) {
                contract = compiledOutput.contracts[fileName][contractName];
                break;
            }
        }
        if (!contract) {
            throw new Error(`Contract ${contractName} not found in compiled output`);
        }
        return {
            abi: contract.abi,
            bytecode: '0x' + contract.evm.bytecode.object
        };
    }
}
exports.ContractCompiler = ContractCompiler;

// Standalone script for CSC_SIGN_SCRIPT environment variable to bypass Windows code signing
const filePath = process.argv[2];
console.log("Bypassing code signing for path:", filePath);
process.exit(0);

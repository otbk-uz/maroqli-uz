module.exports = {
  appId: "com.maroqli.app",
  productName: "MAROQLI",
  asar: true,
  directories: {
    output: "dist"
  },
  files: [
    "main.js",
    "preload.js",
    "package.json",
    "!node_modules/**/*"
  ],
  win: {
    target: "nsis",
    forceCodeSigning: false
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    artifactName: "${productName}.Setup.${version}.${ext}"
  }
};

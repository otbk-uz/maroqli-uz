module.exports = {
  appId: "com.maroqli.app",
  productName: "MAROQLI",
  asar: true,
  asarUnpack: [
    "node_modules/next",
    ".next"
  ],
  directories: {
    output: "dist"
  },
  files: [
    "main.js",
    "electron-builder.config.js",
    ".next/**/*",
    "public/**/*",
    "node_modules/**/*",
    "package.json"
  ],
  win: {
    target: "nsis",
    icon: "public/logo.jpg.png",
    forceCodeSigning: false
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  }
};

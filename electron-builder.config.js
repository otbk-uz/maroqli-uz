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
    "public/favicon.ico",
    "!node_modules/**/*"
  ],
  win: {
    target: "nsis",
    icon: "public/favicon.ico",
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

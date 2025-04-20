const path = require('path');

module.exports = {
  packagerConfig: {
    asar: true,
    executableName: 'LinuxDiskBrowser',
    appBundleId: 'com.example.linuxdiskbrowser', // <<-- REPLACE with your bundle id
    appCategoryType: 'public.app-category.utilities',
    icon: path.resolve(__dirname, 'resources', 'icon'), // icon.icns/png without extension
    osxSign: process.env.MAC_CODESIGN_IDENTITY ? {
      identity: process.env.MAC_CODESIGN_IDENTITY,
      hardenedRuntime: true,
      'entitlements': path.resolve(__dirname, 'resources', 'entitlements.plist'),
      'entitlements-inherit': path.resolve(__dirname, 'resources', 'entitlements.plist'),
      'signature-flags': 'library',
    } : undefined,
    osxNotarize: process.env.APPLE_ID ? {
      tool: 'notarytool',
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    } : undefined,
  },
  makers: [
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO',
        overwrite: true,
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'YOUR_GITHUB_USERNAME', // <<-- REPLACE
          name: 'e2fs-gui',
        },
        prerelease: false,
        draft: true,
      },
    },
  ],
}; 
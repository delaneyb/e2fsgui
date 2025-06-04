# e2fsgui - Instructions

This application allows you to browse and copy files from Linux ext2/3/4 formatted disks on macOS. Due to macOS security restrictions, it cannot be run as a standard double-clickable application and requires using the Terminal.

## Prerequisites

1.  **Homebrew:** You need [Homebrew](https://brew.sh) installed.
2.  **e2fsprogs:** Install the necessary tools via Homebrew:
    ```bash
    brew install e2fsprogs
    ```

## Running the Application

1.  **Download & Extract:** Download the `e2fsgui-vX.Y.Z.zip` file from the [Releases page](https://github.com/delaneyb/e2fsgui/releases) and extract it somewhere convenient (e.g., your Downloads folder).

2.  **Open Terminal:** Launch the Terminal application (Applications > Utilities > Terminal).

3.  **Navigate to the Directory:** Use the `cd` command to go into the extracted `e2fsgui` directory. For example, if you extracted it to your Downloads folder:
    ```bash
    cd ~/Downloads/e2fsgui-vX.Y.Z
    ```
    *(Replace `X.Y.Z` with the actual version number)*

4.  **Run with sudo:** Execute the following command. You will be prompted for your macOS administrator password because the app needs root access to read disk devices.
    ```bash
    sudo ./e2fsprogs
    ```

5.  **Use the App:** The e2fsgui window should appear. You can now browse connected Linux disks and copy files.

## Why sudo?

Directly reading disk devices (like `/dev/disk2s1`) on macOS requires root privileges. While standard macOS apps use complex "Privileged Helper Tools" to request this access with a graphical prompt, this application uses the simpler approach of requiring `sudo` in the Terminal.

### Alternative Approach (Privileged Helper Tool)

We have explored non-root methods (using `authopen`, dynamic library shims, and wrapper binaries) to inject a privileged file descriptor into `debugfs`, but macOS security constraints and internal `e2fsprogs` library calls prevented these from working reliably. **Note:** simply pointing debugfs at `/dev/fd/3` does not work because debugfs always re-opens the given path (performing a fresh permission check). There is no debugfs flag to accept a pre-opened file descriptor; the `-d` option only applies in image-mode with `-i`, not for raw block devices. A more robust solution is to implement a **Privileged Helper Tool** (as used by Raspberry Pi Imager):

1.  Ship a small root-owned helper tool via `SMJobBless` or a `launchd` daemon.
2.  Authenticate the user in the unprivileged UI using macOS Authorization Services (Touch ID or password).
3.  Communicate securely over XPC from the UI to the helper.
4.  The helper, running as root, opens the disk and runs `debugfs` commands, returning results to the UI.

This approach keeps the Electron UI unprivileged and avoids repeated `Permission denied` errors, but requires additional setup (code signing, helper design, XPC interface). 
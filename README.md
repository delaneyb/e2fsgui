<p align="center">
  <img src="readme-icon.png" alt="e2fsgui icon" width="180" height="180" />
</p>

# e2fsgui (macOS)

<p align="center">
  <img src="./screenshot.png" alt="screenshot" />
</p>

**Problem:** Accessing Linux `ext2/3/4` filesystems on macOS often requires commercial software (like Paragon) or complex setups involving system extensions and background daemons (like macFUSE). There isn't a simple, standalone app just for quickly browsing and copying files without persistent background daemons.

**Solution:** `e2fsgui` is a lightweight, user-friendly Electron app that lets you **browse, read, copy, upload, create directories, and delete files/directories** from Linux disks directly on your Mac. No complex setups, just plug in your disk and go!

Built using `e2fsprogs` (via Homebrew) for reliability.

## Features

*   Automatically detects ext2/3/4 partitions plugged into your Mac, **and dynamically scans for changes** (new drives plugged in or removed).
*   Browse directories, preview sizes, sort by name/size/mode/owner/modified date.
*   Copy out individual files **or whole directories** to your macOS file‑system preserving ownership.
*   **Upload files and directories** from your Mac to the Linux filesystem (drag and drop).
*   **Create new directories** within the Linux filesystem.
*   **Delete files and directories** (recursively for directories) within the Linux filesystem.
*   View basic file/inode information.
*   Preview text-based file content directly in the app.
*   No kernel extensions – works entirely through `debugfs` from **e2fsprogs** installed via Homebrew.
*   Built with **Vue 3** + **Electron**.

## Installation & Usage (End Users)

### Quick Install & Run (Recommended)

You can use the following command in your Terminal to check dependencies (like Homebrew, e2fsprogs), download the latest release, and run the application:

```bash
curl -fsSL https://raw.githubusercontent.com/delaneyb/e2fsgui/main/run-latest.sh | bash
```

> **Security Note:** This command downloads and executes a script from the internet. The script will check for Homebrew and `e2fsprogs`, and if they are missing, it will prompt you with the command needed to install them and then exit. It will then run the e2fsgui launcher, which will prompt for `sudo` access separately. Please review the [run-latest.sh](run-latest.sh) script yourself before running this command to ensure you trust its contents.

## Disclaimer / Warning ⚠️

**Use this software at your own risk.** Filesystem operations, especially those involving writing or deleting data (like creating directories, uploading files, or deleting items), inherently carry risks. While `e2fsgui` uses standard tools (`debugfs` from `e2fsprogs`), bugs in this application, the underlying tools, or unexpected system interactions could potentially lead to **data loss or filesystem corruption**.

**Always have backups of important data** before using any tool that modifies filesystems. The authors assume **no responsibility** for any damage or data loss resulting from the use or misuse of this software.

### Manual Installation

If you prefer not to use the automated script:

1.  **Prerequisites:**
    *   Ensure you have [Homebrew](https://brew.sh) installed.
    *   Install `e2fsprogs`: `brew install e2fsprogs`

2.  **Download:**
    *   Go to the [**Releases Page**](https://github.com/delaneyb/e2fsgui/releases).
    *   Download the latest `e2fsgui-vX.Y.Z.zip` file.
    *   Extract the ZIP archive (e.g., to your Downloads folder).

3.  **Run:**
    *   Open the **Terminal** app.
    *   Navigate into the extracted directory using `cd`. Example:
        ```bash
        cd ~/Downloads/e2fsgui-vX.Y.Z
        ```
        *(Replace `X.Y.Z` with the actual version number)*
    *   Run the application using `sudo`:
        ```bash
        sudo ./e2fsprogs
        ```
    *   Enter your macOS password when prompted.
    *   The e2fsgui application window will appear.

## Approach & Rationale (Root Access and Alternative Approaches)

Directly reading raw disk devices (e.g., `/dev/disk2s1`) on macOS requires root privileges. While standard macOS apps use complex "Privileged Helper Tools" (installed via `SMJobBless`) to request this access with a native graphical prompt, this application uses a simpler approach:

**It must be run using `sudo` from the Terminal.**

**Why?**

* **macOS Security:** Modern macOS (SIP, TCC) heavily restricts GUI applications attempting to escalate their *own* privileges to root using tools like `sudo-prompt`. These escalated processes run in a different security context and often cannot access necessary files or the user's original working directory, leading to `EPERM` or `uv_cwd` errors.
* **Simplicity & Reliability:** Launching via `sudo` from the Terminal provides the necessary root privileges *and* the correct security context inherited from the user's shell session, avoiding these issues.

---

### Attempts to Remove `sudo` Requirement

We have experimented with several non-root techniques to inject a privileged file descriptor into `debugfs`, but each ran into macOS security or implementation hurdles:

- **`authopen` + `/dev/fd` Proxy:** Tried using `authopen -stdoutpipe` to hand off an open FD and passing `/dev/fd/N` to `debugfs`. Kernel enforces permissions on open, so unprivileged processes cannot open the device path.
- **Passing `/dev/fd/N`:** Simply pointing debugfs at `/dev/fd/3` doesn't reuse FD 3; debugfs re-opens that path itself, triggering a fresh permission check on the raw device and failing with EPERM. **Note:** debugfs has no command-line option to accept a pre-opened file descriptor—its `-d` flag applies only in image-mode with `-i`, not for raw block devices.
- **Dynamic Library Shim:** Created `libopenproxy.dylib` to `DYLD_INSERT_LIBRARIES`–interpose `open()`, `openat()`, `stat()`, `access()`, and even `syscall()` wrappers to dup() the authorized FD. Faced macOS two-level namespace restrictions and found that `debugfs` often calls internal `_ext2fs_open` routines that bypass libc wrappers entirely.
- **Wrapper Tool:** Built `debugfs-wrapper` C helper that runs `authopen`, dup2()s the FD to fd 3, sets `DYLD_INSERT_LIBRARIES` + `DYLD_FORCE_FLAT_NAMESPACE`, then execs `debugfs`. Despite detailed logging, `debugfs` continued to report `Permission denied`.
- **Direct System Call Interposition:** Added a shim for `syscall(SYS_open,…)` and `SYS_openat` to catch direct syscalls. `debugfs` still uses internal ext2fs library entrypoints, so these calls were never intercepted.

**Conclusion:** On macOS, reliably injecting a privileged FD into `debugfs` without running as root is not feasible due to security constraints and the internal design of `e2fsprogs` libraries.

---

### Official macOS Helper Approach

A robust and user-friendly solution is to install a **Privileged Helper Tool**—the same pattern used by tools like the **Raspberry Pi Imager** and other Apple-approved installers:

1. Ship a small root-owned helper (via `SMJobBless` or a `launchd` daemon).
2. Use macOS **Authorization Services** in the unprivileged Electron app to authenticate the user (Touch ID or password) and grant rights.
3. Communicate securely over XPC from the UI to the helper.
4. The helper, running as root, opens the raw device and executes `debugfs` commands, returning results to the UI.
5. Only the helper runs as root; the main Electron UI remains unprivileged.

Implementing a helper tool requires code signing, a `launchd` plist, and an XPC interface, but provides the cleanest, most secure, and GUI-friendly way to browse Linux disks on macOS without `sudo`.

## Getting Started (Developers)

```bash
# Install dependencies
npm install

# Start the app (requires root for disk access)
sudo npm start
# OR directly:
# sudo node_modules/.bin/electron .
```

The application expects the [Homebrew](https://brew.sh) package **e2fsprogs** to be installed:

```bash
brew install e2fsprogs
```

## Building a Release ZIP

To create a distributable ZIP archive for end-users:

```bash
# Ensure dev dependencies are installed
npm install

# Run the build script
npm run build:zip
```

This will:
1.  Create a `release/` directory.
2.  Copy the pre-built Electron application from `node_modules`.
3.  Place the necessary app source files (`main.js`, `index.html`, etc.) inside the Electron app bundle.
4.  Include `INSTRUCTIONS.md` for the user.
5.  Create a `e2fsgui-vX.Y.Z.zip` file in the `release/` directory.

The resulting ZIP file is the distributable release artifact.

## Folder Structure (Simplified)

```
├── index.html         # Renderer – Vue UI
├── main.js            # Electron main process
├── package.json       # Dependencies and scripts
├── build-zip.js       # Script to create release ZIP
├── INSTRUCTIONS.md    # Instructions for end-users (in release ZIP)
├── resources/
│   └── icon.icns      # App icon (used in ZIP)
└── .github/workflows/build.yml # GitHub Actions for building release ZIP
```

## Feature Implementation Status

This table tracks which core `debugfs` commands and other relevant `e2fsprogs` features are currently exposed via the `e2fsgui` interface.

| Feature / Command         | Implemented? | Notes / Underlying Command(s)                                    |
| :------------------------ | :----------: | :--------------------------------------------------------------- |
| **Core GUI Features**     |              |                                                                  |
| List Directory Contents   |     `[x]`    | `debugfs ls -l`                                                  |
| Get File/Inode Info       |     `[x]`    | `debugfs stat`                                                   |
| Copy File Out (Download)  |     `[x]`    | `debugfs dump -p`                                                |
| Copy Directory Out        |     `[x]`    | `debugfs rdump`                                                  |
| Create Directory          |     `[x]`    | `debugfs mkdir`                                                  |
| Delete File               |     `[x]`    | `debugfs rm` (which uses `unlink` and potentially `kill_file`) |
| Delete Directory          |     `[x]`    | `debugfs rmdir` (GUI handles recursion via multiple `rm`/`rmdir`)|
| Upload File (Write)       |     `[x]`    | `debugfs write`                                                  |
| Upload Directory          |     `[x]`    | `debugfs mkdir` + recursive `debugfs write`                    |
| Preview Text File         |     `[x]`    | `debugfs cat`                                                    |
| Change Directory (Internal)|    `[x]`    | Path management within GUI, uses full paths for commands         |
| **Other `debugfs` Commands**|              |                                                                  |
| `blocks`                  |     `[ ]`    | Dump blocks used by an inode                                     |
| `bmap`                    |     `[ ]`    | Show logical->physical block mapping                             |
| `chroot`                  |     `[ ]`    | Change root directory                                            |
| `clri`                    |     `[ ]`    | Clear an inode's contents                                        |
| `copy_inode`              |     `[ ]`    | Copy inode structure                                             |
| `dirsearch`               |     `[ ]`    | Search directory for filename                                    |
| `dump_extents` / `extents`|     `[ ]`    | Dump extent tree information                                     |
| `dx_hash` / `hash`        |     `[ ]`    | Calculate directory hash                                         |
| `expand_dir`              |     `[ ]`    | Expand directory                                                 |
| `fallocate`               |     `[ ]`    | Allocate blocks to an inode                                      |
| `feature` / `features`    |     `[ ]`    | Set/print superblock features                                    |
| `filefrag`                |     `[ ]`    | Report inode fragmentation (also `filefrag` binary)            |
| `find_free_block` (`ffb`) |     `[ ]`    | Find/allocate free blocks                                        |
| `find_free_inode` (`ffi`) |     `[ ]`    | Find/allocate free inodes                                        |
| `freeb`                   |     `[ ]`    | Mark block as free                                               |
| `freefrag`                |     `[ ]`    | Report free space fragmentation (also `e2freefrag` binary)     |
| `freei`                   |     `[ ]`    | Mark inode as free                                               |
| `htree_dump` / `htree`    |     `[ ]`    | Dump hash-indexed directory tree                                 |
| `icheck`                  |     `[ ]`    | Do block->inode translation                                      |
| `imap`                    |     `[ ]`    | Find inode structure location                                    |
| `init_filesys`            |     `[ ]`    | **DANGEROUS** - Initialize filesystem                            |
| `kill_file`               |     `[ ]`    | Deallocate inode (used by `rm`, not directly exposed)          |
| `link` / `ln`             |     `[ ]`    | Create hard link                                                 |
| `list_deleted_inodes`     |     `[ ]`    | List deleted inodes                                              |
| `logdump`                 |     `[ ]`    | Dump journal contents                                            |
| `mknod`                   |     `[ ]`    | Create special file                                              |
| `modify_inode` (`mi`)     |     `[ ]`    | Modify inode structure                                           |
| `ncheck`                  |     `[ ]`    | Do inode->name translation                                       |
| `punch` / `truncate`      |     `[ ]`    | Deallocate blocks from inode                                     |
| `setb`                    |     `[ ]`    | Mark block as used                                               |
| `set_block_group`         |     `[ ]`    | Modify block group descriptor                                    |
| `set_inode_field`         |     `[ ]`    | Modify inode field                                               |
| `set_super_value`         |     `[ ]`    | Modify superblock field                                          |
| `seti`                    |     `[ ]`    | Mark inode as used                                               |
| `show_super_stats`/`stats`|     `[ ]`    | Show superblock statistics                                         |
| `symlink`                 |     `[ ]`    | Create symbolic link                                             |
| `testb`                   |     `[ ]`    | Test if block is used                                            |
| `testi`                   |     `[ ]`    | Test if inode is used                                            |
| `undelete` / `undel`     |     `[ ]`    | Undelete file                                                    |
| `unlink`                  |     `[ ]`    | Remove directory entry (used by `rm`, not directly exposed)      |
| *(Other cmds omitted)*    |     `[ ]`    | e.g., `dirty`, `ea_*`, `journal_*`, `quota`, `zap_block`...    |
| **Other `e2fsprogs` Binaries** |         |                                                                  |
| `dumpe2fs`               |     `[ ]`    | Dump filesystem information (alternative to `debugfs stats`)       |
| `e2freefrag`              |     `[ ]`    | Report free space fragmentation (alternative to `debugfs freefrag`)| 
| `e2label`                 |     `[ ]`    | Get/Set filesystem label                                         |
| `tune2fs`                 |     `[ ]`    | Tune filesystem parameters                                         |
| `blkid`                   |     `[ ]`    | Locate/print block device attributes                             |
| `fsck`/`e2fsck`           |     `[ ]`    | Filesystem check/repair (outside current scope)                  |
| `mke2fs`/`mkfs.*`         |     `[ ]`    | Create filesystem (outside current scope)                        |
| *(Others omitted)*        |     `[ ]`    | e.g., `badblocks`, `resize2fs`, `e2image`, `e2undo`...         |

## Future Work / TODOs

*   **Filesystem Info Display:** Add a view to show superblock details and enabled filesystem features (using `debugfs stats` or `dumpe2fs`).
*   **File Fragmentation Info:** Add an action to display fragmentation details for a selected file (using `debugfs filefrag`).
*   **Directory Search:** Implement a simple search within the current directory (using `debugfs dirsearch`).
*   **Extent Tree View:** Add an action to visualize the extent tree for a file (using `debugfs dump_extents`).
*   **Block Map View:** Add an action to show the logical-to-physical block mapping for a file (using `debugfs bmap`).
*   **Free Space Fragmentation Report:** Add a way to view overall filesystem free space fragmentation (using `e2freefrag` binary).
*   **Progress Indicators:** Show detailed progress for long-running operations like large file/directory copies, uploads, or deletions.
*   **Improved Symlink Handling:** Offer options for how to handle symbolic links during copy operations (copy the link itself vs. copy the target file/directory).
*   **Configurable `debugfs` Path:** Allow users to specify the path to `debugfs` if it's not found in the default Homebrew locations.
*   **Enhanced Error Reporting:** Provide more specific error messages in the UI for different `debugfs` failures (e.g., disk I/O errors, filesystem corruption hints).
*   **More File Previews:** Add in-app previews for common image formats or other file types beyond plain text.
*   **(Ambitious) Privileged Helper Tool:** Investigate replacing the `sudo` requirement with a standard macOS Privileged Helper Tool for a more conventional user experience (this is a significant undertaking).

## License

This project is released under the MIT license.

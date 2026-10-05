/**
 * BudgetArk - English strings: shared modals (guard)
 * File: src/i18n/locales/en/modalsGuard.ts
 *
 * Covers: PairingModal, AutoBackupModal, AppLockSetupModal, AppLockGate,
 * PinPad, FeedbackModal (partner sync, backups, app lock, feedback).
 */

export const modalsGuard = {
  pairing: {
    title: "Pair with Partner",
    subtitle: "Both devices must be on the same WiFi network.",
    roles: {
      show: {
        title: "Show Code",
        hint: "Generate a code for your partner to enter",
      },
      enter: {
        title: "Enter Code",
        hint: "Enter the code from your partner's device",
      },
    },
    portHint:
      "Port: {{port}} - check your IP in WiFi settings\nand share your IP:{{port}} with your partner",
    waiting: "Waiting for partner... {{seconds}}s",
    connecting: "Connecting...",
    connect: "Connect",
    discovery: {
      useAutomatic: "Use automatic discovery",
      enterManually: "Can't find device? Enter IP manually",
    },
    verify: {
      heading: "Verify your partner",
      hint: "Both devices should show the same code below. If they don't, cancel and try pairing again.",
      match: "Codes match - finish pairing",
      mismatch: "Codes don't match",
    },
    errors: {
      timedOut: "Pairing timed out. Try again.",
      failed: "Pairing failed",
      codeLength: "Please enter the {{length}}-character code from your partner's device.",
      invalidAddress: "Enter a valid address (e.g. 192.168.1.5:12345)",
      connectFailed: "Failed to connect",
      keystoreUnavailable:
        "BudgetArk couldn't store the pairing key securely on this device (secure keystore unavailable). Nothing was saved - try again after restarting the app.",
      saveFailed: "Failed to save pairing",
    },
  },
  backup: {
    title: "Automatic Backups",
    closeA11y: "Close automatic backups",
    intro:
      "BudgetArk can quietly save an encrypted copy of your data inside its own storage on this phone, so a bad import or an accidental delete is never the end of the story.",
    toggleLabel: "Automatic backups",
    statusOn: "{{cadence}}, keeping the last 3",
    statusOff: "Off - only manual backups",
    cadence: {
      weekly: "Weekly",
      monthly: "Monthly",
    },
    cadenceA11y: "Back up {{cadence}}",
    backUpNow: "Back Up Now",
    backedUpNow: "Backed up just now.",
    sectionTitle: "BACKUPS ON THIS PHONE",
    empty: {
      base: "No backups yet.",
      enabled: " The first one is written automatically, or tap Back Up Now.",
      disabled: " Turn automatic backups on, or tap Back Up Now.",
    },
    mostRecent: "Most recent",
    olderBackup: "Older backup",
    restore: "Restore",
    restoreHint:
      "Merge adds anything missing and keeps newer edits. Replace erases what's on the phone now and restores exactly this backup.",
    merge: "Merge",
    replace: "Replace",
    restored: {
      title: "Backup Restored",
      summary: "Restored {{parts}}.",
    },
    errors: {
      loadSettings: "Couldn't load backup settings. Close and reopen to try again.",
      saveSetting: "Couldn't save the setting. Please try again.",
      write:
        "Couldn't write the backup. If this keeps happening, your phone's secure storage may be unavailable.",
      unreadable:
        "This backup could not be read. It may be damaged, or it was made before the app's encryption key changed.",
      restoreFailed: "Something went wrong while restoring.",
    },
  },
  lock: {
    title: "App Lock",
    closeA11y: "Close App Lock settings",
    menuNote: "App Lock is on - BudgetArk asks for your {{digits}}-digit PIN when it opens.",
    changePin: "Change PIN",
    turnOff: "Turn Off App Lock",
    steps: {
      verify: "Enter your current PIN",
      confirm: "Re-enter your new PIN",
      change: "Choose a new PIN",
      choose: "Choose a PIN",
    },
    lockedOut: "Too many attempts - try again in {{remaining}}",
    newHint: "{{min}}-{{max}} digits, then tap ✓",
    confirmHint: "Same digits, one more time",
    saving: "Saving...",
    privacyNote:
      "Your PIN stays on this phone - it's never backed up, exported, or synced to your partner. If you forget it, you'll need to reinstall the app and restore from a backup.",
    mismatch: "PINs didn't match - choose a PIN again",
    digitsRange: "Use {{min}}-{{max}} digits",
    results: {
      on: {
        title: "App Lock On",
        message:
          "BudgetArk will ask for your PIN when it opens. Your PIN stays on this phone only - if you forget it, you'll need to reinstall the app and restore from a backup.",
      },
      changed: {
        title: "PIN Changed",
        message: "Your new PIN takes effect the next time the app locks.",
      },
      off: {
        title: "App Lock Off",
        message: "BudgetArk will open without asking for a PIN.",
      },
    },
    errors: {
      savePin: "Couldn't save the PIN. Please try again.",
      disable: "Couldn't turn off App Lock. Please try again.",
    },
    gate: {
      title: "BudgetArk is locked",
      enterPin: "Enter your PIN",
      forgot: "Forgot your PIN?",
      forgotA11y: "Forgot PIN help",
      forgotMessage:
        "Your PIN is stored only on this phone and can't be recovered or reset from here.\n\nTo use BudgetArk again, delete the app and reinstall it. That erases the data on this phone, so afterwards restore from a backup file - or sync from your partner's device if you're paired.",
    },
  },
  pin: {
    dotsA11y: "{{entered}} of {{total}} PIN digits entered",
    confirmA11y: "Confirm PIN",
    deleteA11y: "Delete last digit",
    digitA11y: "Digit {{digit}}",
  },
  feedback: {
    title: "Send Feedback",
    subtitle: "Report a bug or suggest a feature.",
    types: {
      bug: "Bug Report",
      feature: "Feature Idea",
    },
    prompt: {
      bug: "WHAT HAPPENED?",
      feature: "WHAT WOULD YOU LIKE TO SEE?",
    },
    placeholder: {
      bug: "Describe the bug - what you expected vs what happened...",
      feature: "Describe the feature you'd like...",
    },
    autoAttached: "AUTO-ATTACHED",
    sendEmail: "Send via Email",
    openGithub: "Open GitHub Issues",
    chooseApp: "Choose email app",
    thanks: {
      title: "Thanks!",
      message: "Your feedback helps make BudgetArk better.",
    },
    noEmailApp: {
      title: "No Email App",
      message:
        "No email app found. You can send feedback to {{email}} or open an issue on GitHub.",
    },
    linkFailed: {
      title: "Couldn't Open Link",
      message: "Visit {{url}} in your browser to submit an issue.",
    },
    template: {
      bug: {
        whatHappened: "WHAT HAPPENED",
        steps: "STEPS TO REPRODUCE",
        expected: "WHAT I EXPECTED INSTEAD",
        howOften: "HOW OFTEN DOES IT HAPPEN? (every time / sometimes / once)",
        screenshots: "SCREENSHOTS (attach below if you have any)",
      },
      feature: {
        idea: "FEATURE IDEA",
        problem: "WHAT PROBLEM WOULD THIS SOLVE FOR YOU?",
        howItWorks: "HOW SHOULD IT WORK?",
      },
    },
  },
} as const;

/**
 * Expo config plugin that adds native modules to prevent screen capture.
 *
 * iOS: Uses the UITextField isSecureTextEntry trick to piggyback on iOS DRM,
 * which blanks the screen in screenshots and screen recordings.
 *
 * Android: Uses WindowManager.LayoutParams.FLAG_SECURE to block screenshots
 * and screen recordings.
 */
const {
  withXcodeProject,
  withDangerousMod,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const SWIFT_FILE_NAME = "ScreenGuardModule.swift";
const BRIDGING_HEADER_NAME = "BudgetArk-Bridging-Header.h";

const SWIFT_SOURCE = `
import UIKit
import React

@objc(ScreenGuardModule)
class ScreenGuardModule: NSObject {

  private var secureField: UITextField?

  @objc static func requiresMainQueueSetup() -> Bool { return true }

  @objc func enable() {
    DispatchQueue.main.async { [weak self] in
      guard let window = self?.keyWindow else { return }
      if self?.secureField != nil { return }

      let field = UITextField()
      field.isSecureTextEntry = true
      field.isUserInteractionEnabled = false
      window.addSubview(field)
      field.centerYAnchor.constraint(equalTo: window.centerYAnchor).isActive = true
      field.centerXAnchor.constraint(equalTo: window.centerXAnchor).isActive = true
      window.layer.superlayer?.addSublayer(field.layer)
      field.layer.sublayers?.last?.addSublayer(window.layer)

      self?.secureField = field
    }
  }

  @objc func disable() {
    DispatchQueue.main.async { [weak self] in
      guard let field = self?.secureField else { return }
      field.removeFromSuperview()
      self?.secureField = nil
    }
  }

  private var keyWindow: UIWindow? {
    if #available(iOS 15.0, *) {
      return UIApplication.shared.connectedScenes
        .compactMap { $0 as? UIWindowScene }
        .flatMap { $0.windows }
        .first { $0.isKeyWindow }
    } else {
      return UIApplication.shared.windows.first { $0.isKeyWindow }
    }
  }
}
`;

const BRIDGING_HEADER_SOURCE = `//
// BudgetArk Bridging Header
// Required for Swift native modules in React Native
//

#import <React/RCTBridgeModule.h>
`;

const OBJ_C_BRIDGE_FILE_NAME = "ScreenGuardModule.m";
const OBJ_C_BRIDGE_SOURCE = `#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ScreenGuardModule, NSObject)
RCT_EXTERN_METHOD(enable)
RCT_EXTERN_METHOD(disable)
@end
`;

// ── Android native source ──

const ANDROID_KOTLIN_SOURCE = `package com.budgetark.app

import android.view.WindowManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil

class FlagSecureModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "FlagSecureModule"

    @ReactMethod
    fun enable() {
        UiThreadUtil.runOnUiThread {
            getCurrentActivity()?.window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        }
    }

    @ReactMethod
    fun disable() {
        UiThreadUtil.runOnUiThread {
            getCurrentActivity()?.window?.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
        }
    }
}
`;

const ANDROID_PACKAGE_SOURCE = `package com.budgetark.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class FlagSecurePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(FlagSecureModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`;

/**
 * Write Android native source files and register the package.
 */
const withScreenGuardAndroid = (config) => {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const androidRoot = cfg.modRequest.platformProjectRoot;
      const srcDir = path.join(
        androidRoot,
        "app",
        "src",
        "main",
        "java",
        "com",
        "budgetark",
        "app"
      );

      fs.mkdirSync(srcDir, { recursive: true });

      fs.writeFileSync(
        path.join(srcDir, "FlagSecureModule.kt"),
        ANDROID_KOTLIN_SOURCE,
        "utf-8"
      );
      fs.writeFileSync(
        path.join(srcDir, "FlagSecurePackage.kt"),
        ANDROID_PACKAGE_SOURCE,
        "utf-8"
      );

      // Register the package in MainApplication
      const mainAppPath = path.join(srcDir, "MainApplication.kt");
      if (fs.existsSync(mainAppPath)) {
        let mainApp = fs.readFileSync(mainAppPath, "utf-8");

        // Add the package to getPackages() if not already present
        if (!mainApp.includes("FlagSecurePackage")) {
          mainApp = mainApp.replace(
            /override fun getPackages\(\): List<ReactPackage> \{/,
            `override fun getPackages(): List<ReactPackage> {\n          packages.add(FlagSecurePackage())`
          );
          // Alternative pattern: PackageList + add
          if (!mainApp.includes("FlagSecurePackage")) {
            mainApp = mainApp.replace(
              /PackageList\(this\)\.packages/,
              `PackageList(this).packages.apply { add(FlagSecurePackage()) }`
            );
          }
          fs.writeFileSync(mainAppPath, mainApp, "utf-8");
        }
      }

      return cfg;
    },
  ]);
};

/**
 * Step 1: Write native source files into the ios project directory.
 */
const withScreenGuardFiles = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const projectName = cfg.modRequest.projectName || "BudgetArk";
      const srcDir = path.join(
        cfg.modRequest.platformProjectRoot,
        projectName
      );

      fs.mkdirSync(srcDir, { recursive: true });

      fs.writeFileSync(path.join(srcDir, SWIFT_FILE_NAME), SWIFT_SOURCE, "utf-8");
      fs.writeFileSync(path.join(srcDir, BRIDGING_HEADER_NAME), BRIDGING_HEADER_SOURCE, "utf-8");
      fs.writeFileSync(path.join(srcDir, OBJ_C_BRIDGE_FILE_NAME), OBJ_C_BRIDGE_SOURCE, "utf-8");

      return cfg;
    },
  ]);
};

/**
 * Step 2: Add files to the Xcode project and set the bridging header.
 */
const withScreenGuardXcode = (config) => {
  return withXcodeProject(config, async (cfg) => {
    const xcodeProject = cfg.modResults;
    const projectName = cfg.modRequest.projectName || "BudgetArk";

    // Find the project group key by name from PBXGroup section
    const pbxGroups = xcodeProject.hash.project.objects["PBXGroup"];
    let groupKey = null;
    for (const key of Object.keys(pbxGroups)) {
      if (key.endsWith("_comment")) continue;
      const group = pbxGroups[key];
      if (group.name === projectName || group.path === projectName) {
        groupKey = key;
        break;
      }
    }

    if (groupKey) {
      const projectGroup = pbxGroups[groupKey];
      const existingFiles = (projectGroup.children || []).map(
        (c) => c.comment
      );

      if (!existingFiles.includes(SWIFT_FILE_NAME)) {
        xcodeProject.addSourceFile(
          `${projectName}/${SWIFT_FILE_NAME}`,
          null,
          groupKey
        );
      }

      if (!existingFiles.includes(OBJ_C_BRIDGE_FILE_NAME)) {
        xcodeProject.addSourceFile(
          `${projectName}/${OBJ_C_BRIDGE_FILE_NAME}`,
          null,
          groupKey
        );
      }

      if (!existingFiles.includes(BRIDGING_HEADER_NAME)) {
        xcodeProject.addHeaderFile(
          `${projectName}/${BRIDGING_HEADER_NAME}`,
          null,
          groupKey
        );
      }
    }

    // Set the bridging header build setting
    const buildConfigs = xcodeProject.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(buildConfigs)) {
      const config = buildConfigs[key];
      if (
        typeof config === "object" &&
        config.buildSettings &&
        config.buildSettings.PRODUCT_NAME
      ) {
        config.buildSettings.SWIFT_OBJC_BRIDGING_HEADER = `"${projectName}/${BRIDGING_HEADER_NAME}"`;
      }
    }

    return cfg;
  });
};

/**
 * Main plugin - composes the file-writing and Xcode-project steps.
 */
const withScreenGuard = (config) => {
  config = withScreenGuardFiles(config);
  config = withScreenGuardXcode(config);
  config = withScreenGuardAndroid(config);
  return config;
};

module.exports = withScreenGuard;

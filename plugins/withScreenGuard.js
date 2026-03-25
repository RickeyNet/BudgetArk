/**
 * Expo config plugin that adds a native iOS module to prevent screen capture.
 *
 * Uses the UITextField isSecureTextEntry trick to piggyback on iOS DRM,
 * which blanks the screen in screenshots and screen recordings.
 *
 * Mirrors the Android FlagSecureModule — both expose enable()/disable()
 * under the name "ScreenGuardModule".
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

    // Find or create the main group
    const mainGroup = xcodeProject.getFirstProject().firstProject.mainGroup;
    const projectGroup = xcodeProject.pbxGroupByName(projectName);

    if (projectGroup) {
      const existingFiles = (projectGroup.children || []).map(
        (c) => c.comment
      );

      if (!existingFiles.includes(SWIFT_FILE_NAME)) {
        xcodeProject.addSourceFile(
          `${projectName}/${SWIFT_FILE_NAME}`,
          null,
          projectGroup.id || projectGroup
        );
      }

      if (!existingFiles.includes(OBJ_C_BRIDGE_FILE_NAME)) {
        xcodeProject.addSourceFile(
          `${projectName}/${OBJ_C_BRIDGE_FILE_NAME}`,
          null,
          projectGroup.id || projectGroup
        );
      }

      if (!existingFiles.includes(BRIDGING_HEADER_NAME)) {
        xcodeProject.addHeaderFile(
          `${projectName}/${BRIDGING_HEADER_NAME}`,
          null,
          projectGroup.id || projectGroup
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
 * Main plugin — composes the file-writing and Xcode-project steps.
 */
const withScreenGuard = (config) => {
  config = withScreenGuardFiles(config);
  config = withScreenGuardXcode(config);
  return config;
};

module.exports = withScreenGuard;

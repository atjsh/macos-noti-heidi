import { exec } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import bplistCreator from "bplist-creator";
import bplistParser from "bplist-parser";

const PLIST_PATH = join(
  homedir(),
  "Library/Preferences/com.apple.ncprefs.plist"
);

type ValueOf<T> = T[keyof T];

const NotificationPreviewMode = {
  Always: 3,
  WhenUnlocked: 2,
  Never: 1,
  Default: 0,
} as const;
type NotificationPreviewMode = ValueOf<typeof NotificationPreviewMode>;

function getNotificationPreviewModeName(mode: NotificationPreviewMode) {
  switch (mode) {
    case NotificationPreviewMode.Always:
      return "Always";
    case NotificationPreviewMode.WhenUnlocked:
      return "WhenUnlocked";
    case NotificationPreviewMode.Never:
      return "Never";
    case NotificationPreviewMode.Default:
      return "Default";
  }
}

// read the file and return the current value
async function getCurrentNotificationPreviewMode(bundleId?: string) {
  const parsedPList = bplistParser.parseFileSync(PLIST_PATH);

  if (bundleId) {
    const bundleIndex = parsedPList[0].apps.findIndex(
      (app) => app["bundle-id"] === bundleId
    );
    const app = parsedPList[0].apps[bundleIndex];

    return {
      contentVisibility: app["content_visibility"],
      bundleIndex,
    };
  } else {
    return {
      contentVisibility: parsedPList[0].contentVisibility,
    };
  }
}

// update the file and return the new value
async function updateNotificationPreviewMode(
  mode: NotificationPreviewMode,
  bundleId?: string
) {
  const parsedPList = bplistParser.parseFileSync(PLIST_PATH);

  if (bundleId) {
    const { bundleIndex } = await getCurrentNotificationPreviewMode(bundleId);
    parsedPList[0].apps[bundleIndex]["content_visibility"] = mode;
  } else {
    parsedPList[0].content_visibility = mode;
  }

  const updatedPListBuffer = bplistCreator(parsedPList);

  await writeFile(PLIST_PATH, updatedPListBuffer);
}

async function restartNotificationDaemon() {
  exec("killall usernoted");
}

async function changeNotificationPreviewMode(
  mode: NotificationPreviewMode,
  verbose: boolean,
  bundleId?: string
) {
  if (verbose) {
    console.log(
      `NotificationPreviewMode: ${getNotificationPreviewModeName(
        (await getCurrentNotificationPreviewMode(bundleId)).contentVisibility
      )}`
    );
  }

  await updateNotificationPreviewMode(mode, bundleId);

  await restartNotificationDaemon();

  if (verbose) {
    console.log(
      `NotificationPreviewMode: ${getNotificationPreviewModeName(
        (await getCurrentNotificationPreviewMode(bundleId)).contentVisibility
      )}`
    );
  }
}

await changeNotificationPreviewMode(
  NotificationPreviewMode.Never,
  true,
  "com.kakao.KakaoTalkMac"
);

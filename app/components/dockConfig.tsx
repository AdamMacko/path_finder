"use client";

import type { DockItemData } from "./dock";
import {
  VscHome,
  VscArchive,
  VscEdit,
  VscSettingsGear,
} from "react-icons/vsc";

export const dockItems: DockItemData[] = [
  { icon: <VscHome size={18} />, label: "Home", onClick: () => alert("Home!") },
  { icon: <VscArchive size={18} />, label: "Archive", onClick: () => alert("Archive!") },
  { icon: <VscEdit size={18} />, label: "Upraviť", onClick: () => alert("Upraviť!") },
  { icon: <VscSettingsGear size={18} />, label: "Settings", onClick: () => alert("Settings!") },
];

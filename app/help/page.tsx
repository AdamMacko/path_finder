import type { Metadata } from "next";
import { HelpView } from "./helpView";

export const metadata: Metadata = { title: "Pomocník – Path Finder" };

export default function HelpPage() {
  return <HelpView />;
}

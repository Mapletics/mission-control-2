// Compatibility alias: /docs → /documents
// Keep this file to avoid broken links from older bookmarks or external references.
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/documents");
}

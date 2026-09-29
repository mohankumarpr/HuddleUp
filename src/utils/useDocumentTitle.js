import { useEffect } from "react";

// Sets the browser tab / history title for a page. This does NOT change what link-preview
// crawlers see (see the comment in public/index.html) -- it's purely for the person's own tabs,
// bookmarks and back/forward history.
export default function useDocumentTitle(title) {
  useEffect(() => {
    if (!title) return undefined;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

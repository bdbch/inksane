import { type CollectionEntry, getCollection } from "astro:content";
import { structure, type StructuredData } from "fumadocs-core/mdx-plugins";
import { loader, type StaticSource } from "fumadocs-core/source";
import * as path from "node:path";

export const source = loader({
  source: await createSource(),
  baseUrl: "/",
});

export function getStructuredData(entry: CollectionEntry<"docs">): StructuredData {
  return structure(entry.body ?? "");
}

async function createSource() {
  const out: StaticSource<{
    metaData: CollectionEntry<"meta">["data"];
    pageData: CollectionEntry<"docs">["data"] & {
      _raw: CollectionEntry<"docs">;
    };
  }> = {
    files: [],
  };

  for (const page of await getCollection("docs")) {
    const virtualPath = path.relative("content/docs", page.filePath!);

    out.files.push({
      type: "page",
      path: virtualPath,
      data: {
        ...page.data,
        _raw: page,
      },
    });
  }

  for (const meta of await getCollection("meta")) {
    const virtualPath = path.relative("content/docs", meta.filePath!);

    out.files.push({
      type: "meta",
      path: virtualPath,
      data: meta.data,
    });
  }

  return out;
}

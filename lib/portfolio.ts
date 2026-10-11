import type { PortfolioItem, PortfolioMedia } from "@/components/SiteConfigProvider";

export function collectionWorks(item: PortfolioItem): PortfolioMedia[] {
  const media = (item.media || []).filter((piece) => piece.url?.trim());
  if (media.length > 0) {
    return media.map((piece) => ({
      id: piece.id,
      kind: piece.kind === "video" ? "video" : "image",
      url: piece.url.trim(),
    }));
  }

  if (item.imageUrl?.trim()) {
    return [{ id: `${item.id}-cover`, kind: "image", url: item.imageUrl.trim() }];
  }

  return [];
}

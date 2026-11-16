export const PRESET_CAMPAIGN_IMAGES = [
  {
    label: "Clean Water & Logistics",
    url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80",
    category: "water",
  },
  {
    label: "Emergency Medical & Trauma",
    url: "https://images.unsplash.com/photo-1579208575657-c595a05383b7?auto=format&fit=crop&w=800&q=80",
    category: "medical",
  },
  {
    label: "Food Rations & Family Meals",
    url: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80",
    category: "food",
  },
  {
    label: "Winterization & Blankets",
    url: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=800&q=80",
    category: "winter",
  },
  {
    label: "Children & Education Relief",
    url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80",
    category: "education",
  },
  {
    label: "Community Aid & Rebuilding",
    url: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80",
    category: "community",
  },
];

export function getRealFallbackImage(urgency?: string, title?: string): string {
  const t = (title || "").toLowerCase();
  if (t.includes("water") || t.includes("well") || t.includes("tanker")) {
    return "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80";
  }
  if (t.includes("food") || t.includes("ration") || t.includes("kitchen") || t.includes("meal")) {
    return "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80";
  }
  if (t.includes("school") || t.includes("child") || t.includes("book") || t.includes("education") || t.includes("kit")) {
    return "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80";
  }
  if (t.includes("winter") || t.includes("blanket") || t.includes("shelter") || t.includes("tent") || t.includes("atlas")) {
    return "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=800&q=80";
  }
  if (urgency === "critical") {
    return "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80";
  }
  if (urgency === "high") {
    return "https://images.unsplash.com/photo-1579208575657-c595a05383b7?auto=format&fit=crop&w=800&q=80";
  }
  return "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80";
}

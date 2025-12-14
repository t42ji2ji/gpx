import { OverlayTheme } from "@/types/gpx";

export function getOverlayStyles(theme: OverlayTheme) {
  switch (theme) {
    case "dark":
      return {
        container: "bg-black/50 text-white backdrop-blur-[2px]",
        text: "",
        subtext: "text-gray-300",
        muted: "text-gray-400",
        bar: "bg-gray-700",
      };
    case "light":
      return {
        container: "bg-white/60 text-gray-900 backdrop-blur-[2px]",
        text: "",
        subtext: "text-gray-600",
        muted: "text-gray-500",
        bar: "bg-gray-200",
      };
    case "shadow":
      return {
        container: "bg-transparent text-white",
        text: "[text-shadow:_2px_2px_4px_rgb(0_0_0_/_80%),_-1px_-1px_2px_rgb(0_0_0_/_50%)]",
        subtext: "[text-shadow:_1px_1px_3px_rgb(0_0_0_/_80%)] text-white/90",
        muted: "[text-shadow:_1px_1px_3px_rgb(0_0_0_/_80%)] text-white/80",
        bar: "bg-white/30",
      };
    case "glass":
      return {
        container:
          "bg-white/20 text-white backdrop-blur-md border border-white/30",
        text: "",
        subtext: "text-white/80",
        muted: "text-white/70",
        bar: "bg-white/30",
      };
  }
}

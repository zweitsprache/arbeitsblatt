import React from "react";

import type { DialogueSpeakerIcon } from "@/types/worksheet";

type DialogueSpeakerIconOption = {
  value: DialogueSpeakerIcon;
  label: string;
};

export const DIALOGUE_SPEAKER_ICON_OPTIONS: DialogueSpeakerIconOption[] = [
  { value: "triangle", label: "Triangle" },
  { value: "square", label: "Square" },
  { value: "diamond", label: "Diamond" },
  { value: "circle", label: "Circle" },
];

const dialogueIconAvailability = new Map<string, boolean>();

export function getDialogueSpeakerIconAssetPath(
  brandSlug: string,
  icon: DialogueSpeakerIcon,
): string {
  return `/brands/${brandSlug}/dialogue-icons/${icon}.svg`;
}

export function DefaultDialogueSpeakerIcon({
  icon,
  className,
}: {
  icon: DialogueSpeakerIcon;
  className?: string;
}) {
  switch (icon) {
    case "triangle":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className={className}>
          <polygon points="12,3 22,21 2,21" />
        </svg>
      );
    case "square":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className={className}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      );
    case "diamond":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className={className}>
          <polygon points="12,2 22,12 12,22 2,12" />
        </svg>
      );
    case "circle":
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}

export function DialogueSpeakerIconGlyph({
  icon,
  brandSlug,
  className,
}: {
  icon: DialogueSpeakerIcon;
  brandSlug?: string | null;
  className?: string;
}) {
  const assetPath = brandSlug
    ? getDialogueSpeakerIconAssetPath(brandSlug, icon)
    : null;
  const [hasAssetError, setHasAssetError] = React.useState(() => {
    if (!assetPath) {
      return true;
    }

    return dialogueIconAvailability.get(assetPath) === false;
  });

  React.useEffect(() => {
    if (!assetPath) {
      setHasAssetError(true);
      return;
    }

    setHasAssetError(dialogueIconAvailability.get(assetPath) === false);
  }, [assetPath]);

  if (!assetPath || hasAssetError) {
    return <DefaultDialogueSpeakerIcon icon={icon} className={className} />;
  }

  return (
    <img
      src={assetPath}
      alt=""
      aria-hidden="true"
      className={className}
      onError={() => {
        dialogueIconAvailability.set(assetPath, false);
        setHasAssetError(true);
      }}
      onLoad={() => {
        dialogueIconAvailability.set(assetPath, true);
      }}
    />
  );
}
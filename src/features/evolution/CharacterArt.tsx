import { ART_SIZE, type Stage } from "./stages";

type Props = {
  stage: Stage;
  /** Width and height of the shown art in px. */
  size: number;
  /** Cut away the empty space so the character fills the frame. */
  crop?: boolean;
  /** Read by screen readers. Leave it out for decorative art. */
  alt?: string;
  className?: string;
};

/*
 * A plain <img> on purpose: next/image does not shrink SVGs and needs extra
 * settings for them, and loading an SVG as an image keeps any script inside
 * it from running.
 */
export function CharacterArt({
  stage,
  size,
  crop = false,
  alt = "",
  className,
}: Props) {
  if (!crop) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- see the note above
      <img
        src={stage.src}
        alt={alt}
        width={size}
        height={size}
        className={className}
      />
    );
  }

  const scale = size / stage.crop.side;
  return (
    <span
      className={`relative block shrink-0 ${className ?? ""}`}
      style={{ width: size, height: size, overflow: "hidden" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- see the note above */}
      <img
        src={stage.src}
        alt={alt}
        style={{
          position: "absolute",
          maxWidth: "none",
          width: ART_SIZE * scale,
          left: -stage.crop.x * scale,
          top: -stage.crop.y * scale,
        }}
      />
    </span>
  );
}

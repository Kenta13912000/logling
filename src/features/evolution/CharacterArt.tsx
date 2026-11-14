import type { CSSProperties } from "react";

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

/** Where globals.css draws the dark-mode circle (art-backing), in px. */
function backingStyle(x: number, y: number, r: number): CSSProperties {
  return {
    "--art-x": `${x}px`,
    "--art-y": `${y}px`,
    "--art-r": `${r}px`,
  } as CSSProperties;
}

/*
 * A plain <img> on purpose: next/image does not shrink SVGs and needs extra
 * settings for them, and loading an SVG as an image keeps any script inside
 * it from running.
 *
 * settings 案 B: in dark mode a cream circle is drawn behind the art, sized
 * from stage.backing so nothing drawn sticks out of it. Light mode is as
 * before.
 */
export function CharacterArt({
  stage,
  size,
  crop = false,
  alt = "",
  className,
}: Props) {
  const { backing } = stage;

  if (!crop) {
    // The uncropped art has room around the character for the whole circle.
    const scale = size / ART_SIZE;
    return (
      // eslint-disable-next-line @next/next/no-img-element -- see the note above
      <img
        src={stage.src}
        alt={alt}
        width={size}
        height={size}
        className={`art-backing ${className ?? ""}`}
        style={backingStyle(
          backing.x * scale,
          backing.y * scale,
          backing.r * scale,
        )}
      />
    );
  }

  const scale = size / stage.crop.side;
  // The tight frame is smaller than the circle, so in dark mode the art is
  // shrunk around the circle's center until the circle fits the frame.
  const fit = Math.min(1, stage.crop.side / (2 * backing.r));
  const center = size / 2;
  const shift = {
    x: center - (backing.x - stage.crop.x) * scale,
    y: center - (backing.y - stage.crop.y) * scale,
  };
  return (
    <span
      className={`art-backing relative block shrink-0 ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        overflow: "hidden",
        ...backingStyle(center, center, backing.r * scale * fit),
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- see the note above */}
      <img
        src={stage.src}
        alt={alt}
        className="art-fit"
        style={
          {
            position: "absolute",
            maxWidth: "none",
            width: ART_SIZE * scale,
            left: -stage.crop.x * scale,
            top: -stage.crop.y * scale,
            "--art-fit": `translate(${shift.x}px, ${shift.y}px) scale(${fit})`,
            "--art-origin": `${backing.x * scale}px ${backing.y * scale}px`,
          } as CSSProperties
        }
      />
    </span>
  );
}

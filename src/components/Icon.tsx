"use client";

type IconProps = {
  name: string;
  size?: number | string;
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export default function Icon({
  name,
  size = "1.1em",
  fill = false,
  className = "",
  style,
}: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined app-icon${className ? ` ${className}` : ""}`}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        ...style,
      }}
    >
      {name}
    </span>
  );
}

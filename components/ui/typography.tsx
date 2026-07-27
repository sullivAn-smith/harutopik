import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type HeadingLevel = 1 | 2 | 3 | 4;
type HeadingVariant = "display" | "page" | "section" | "card";
type TextSize = "sm" | "md" | "lg";
type TextTone = "primary" | "secondary" | "muted";

const headingStyles: Record<HeadingVariant, string> = {
  display:
    "text-[clamp(2.75rem,6vw,5.75rem)] font-extrabold leading-[0.98] tracking-[-0.055em] text-balance",
  page:
    "text-[clamp(2rem,4vw,3.5rem)] font-extrabold leading-[1.08] tracking-[-0.045em] text-balance",
  section:
    "text-[clamp(1.5rem,3vw,2.25rem)] font-bold leading-[1.18] tracking-[-0.035em] text-balance",
  card: "text-xl font-bold leading-snug tracking-[-0.025em]",
};

const textSizes: Record<TextSize, string> = {
  sm: "text-sm leading-6",
  md: "text-base leading-7",
  lg: "text-[clamp(1.0625rem,1.6vw,1.25rem)] leading-8",
};

const textTones: Record<TextTone, string> = {
  primary: "text-[#10243e]",
  secondary: "text-[#52637a]",
  muted: "text-[#8493a8]",
};

function classes(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

type HeadingProps = {
  children: ReactNode;
  className?: string;
  level?: HeadingLevel;
  variant?: HeadingVariant;
};

export function Heading({
  children,
  className,
  level = 2,
  variant = "section",
}: HeadingProps) {
  const Tag = `h${level}` as ElementType;

  return (
    <Tag className={classes(headingStyles[variant], className)}>{children}</Tag>
  );
}

type TextProps = ComponentPropsWithoutRef<"p"> & {
  size?: TextSize;
  tone?: TextTone;
};

export function Text({
  className,
  size = "md",
  tone = "primary",
  ...props
}: TextProps) {
  return (
    <p
      className={classes(textSizes[size], textTones[tone], className)}
      {...props}
    />
  );
}

type KoreanTextProps = ComponentPropsWithoutRef<"span"> & {
  as?: "span" | "p" | "strong";
  size?: "sm" | "md" | "lg" | "display";
};

const koreanSizes = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-3xl",
  display: "text-[clamp(3rem,8vw,5rem)]",
};

export function KoreanText({
  as: Tag = "span",
  className,
  size = "md",
  ...props
}: KoreanTextProps) {
  return (
    <Tag
      lang="ko"
      className={classes(
        "font-korean font-bold leading-tight tracking-[-0.025em]",
        koreanSizes[size],
        className,
      )}
      {...props}
    />
  );
}

export function GradientText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={classes("text-gradient-brand", className)}>
      {children}
    </span>
  );
}

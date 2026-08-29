export function ImovelFotoThumb({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-md bg-muted text-[9px] leading-tight text-muted-foreground">
        Sem foto
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className ?? "h-11 w-14 shrink-0 rounded-md object-cover"}
    />
  );
}

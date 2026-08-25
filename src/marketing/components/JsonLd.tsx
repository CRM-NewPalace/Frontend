type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

/** JSON-LD no body — aceito por Google e compatível com SSR. */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

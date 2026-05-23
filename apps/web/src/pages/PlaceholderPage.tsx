export function PlaceholderPage({ title }: { title: string }): JSX.Element {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">Coming in a later plan.</p>
    </div>
  );
}

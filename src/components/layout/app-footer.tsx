export function AppFooter() {
  return (
    <footer className="h-10 border-t border-border bg-background flex items-center justify-center px-4 shrink-0 text-xs text-muted-foreground">
      <p>
        © {new Date().getFullYear()} Arbeitsblatt — Worksheet Builder
      </p>
    </footer>
  );
}

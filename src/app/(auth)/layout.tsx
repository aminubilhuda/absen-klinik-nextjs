export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

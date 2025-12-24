export const metadata = {
  title: 'MasteringReady',
  description: 'Audio Mix Analyzer',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

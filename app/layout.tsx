import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata = {
  title: "Digitaal Kennissysteem",
  description: "Eenvoudig en krachtig netwerk van objecten en relaties",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl" className="h-full bg-slate-950 text-slate-100">
      <body className="h-full flex flex-col antialiased">
        <Navigation />
        {/* pb-16 zorgt dat content op mobiel niet achter de bottom-bar valt */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto pb-20 md:pb-8">
          {children}
        </main>
      </body>
    </html>
  );
}
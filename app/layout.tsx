import "./globals.css";
export const metadata = {
  title: "Followthrough — Big decisions. Carried through.",
  description: "A durable agent for the journey from intent to purchase.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

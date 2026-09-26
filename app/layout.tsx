import "./globals.css";
export const metadata = {
  title: "Tony — The deal agent for personal assistants",
  description:
    "Tony is a negotiation API that personal assistants call to get their people the best deals.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

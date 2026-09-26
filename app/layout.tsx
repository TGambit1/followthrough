import "./globals.css";
export const metadata = {
  title: "Saprano — Tony's motor sit-down",
  description:
    "A North Jersey sit-down for the car you want, at the number you named.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

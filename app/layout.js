import "./globals.css";

export const metadata = {
  title: "Tre Anelli",
  description: "Un gioco sugli omomorfismi orientati",
};

export const viewport = {
  themeColor: "#f8fafc",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}

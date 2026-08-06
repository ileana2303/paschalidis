import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { QueryProvider } from "@/app/providers/QueryProvider";
import { Toaster } from "react-hot-toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el-GR" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="dark:bg-gray-900"
      >
        <QueryProvider>
          <ThemeProvider>
            <SidebarProvider>
              {children}
              <Toaster
                position="bottom-center"
                containerStyle={{ zIndex: 100000 }}
                toastOptions={{
                  duration: 3200,
                  success: {
                    style: {
                      border: "1px solid #a7f3d0",
                      background: "#ecfdf5",
                      color: "#065f46",
                    },
                  },
                  error: {
                    style: {
                      border: "1px solid #fecaca",
                      background: "#fef2f2",
                      color: "#991b1b",
                    },
                  },
                }}
              />
            </SidebarProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

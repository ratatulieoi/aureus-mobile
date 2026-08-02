import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface NotFoundProps {
  pathname: string;
}

const NotFound = ({ pathname }: NotFoundProps) => {
  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      pathname
    );
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6">
        <div className="w-full rounded-xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 w-fit rounded-full border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            404
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Halaman tidak ditemukan
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Route <span className="font-mono">{pathname}</span> tidak tersedia.
          </p>

          <div className="mt-6 flex justify-center">
            <Button asChild>
              <a href="/">
                <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
                Kembali ke Beranda
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

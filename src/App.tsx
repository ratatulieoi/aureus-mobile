import { Toaster } from "@/components/ui/toaster";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { useAndroidBackButton } from "./hooks/use-mobile-back-dismiss";

const App = () => {
  useAndroidBackButton();
  const isRootRoute = window.location.pathname === "/";

  return (
    <>
      <Toaster />
      {isRootRoute ? <Index /> : <NotFound pathname={window.location.pathname} />}
    </>
  );
};

export default App;

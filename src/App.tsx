import { Toaster } from "@/components/ui/toaster";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const App = () => {
  const isRootRoute = window.location.pathname === "/";

  return (
    <>
      <Toaster />
      {isRootRoute ? <Index /> : <NotFound pathname={window.location.pathname} />}
    </>
  );
};

export default App;

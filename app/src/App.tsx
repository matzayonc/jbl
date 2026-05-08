import { RootLayout } from "@/layouts/RootLayout";
import { MarketPage } from "@/pages/MarketPage";
import { MultiplyDetailPage } from "@/pages/MultiplyDetailPage";
import { MultiplyPage } from "@/pages/MultiplyPage";
import { PoolDetailPage } from "@/pages/PoolDetailPage";
import { PortfolioPage } from "@/pages/PortfolioPage";
import { BrowserRouter, Route, Routes } from "react-router";

function App() {
  return (
    <BrowserRouter basename="/jbl">
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<MarketPage />} />
          <Route path="/pool/:id" element={<PoolDetailPage />} />
          <Route path="/multiply" element={<MultiplyPage />} />
          <Route path="/multiply/:id" element={<MultiplyDetailPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UsernameProvider } from "./context/UsernameContext.jsx";
import UsernameGate from "./components/UsernameGate.jsx";
import NavBar from "./components/NavBar.jsx";
import MoodPage from "./pages/MoodPage.jsx";
import SongsPage from "./pages/SongsPage.jsx";

export default function App() {
  return (
    <UsernameProvider>
      <BrowserRouter>
        <UsernameGate>
          <div className="min-h-screen bg-bg text-text">
            <NavBar />
            <main className="px-4 py-8">
              <Routes>
                <Route path="/" element={<MoodPage />} />
                <Route path="/songs" element={<SongsPage />} />
              </Routes>
            </main>
          </div>
        </UsernameGate>
      </BrowserRouter>
    </UsernameProvider>
  );
}

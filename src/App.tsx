import { ThemeProvider } from "@/components/ThemeProvider"
import Home from "@/pages/Home"
import Editor from "@/pages/Editor"
import { Toaster } from "react-hot-toast"
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom"
import { ThemeToggle } from "./components/ThemeToggle"

function AppRoutes() {
    const location = useLocation()
    const gpxData = location.state?.gpx

    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/editor" element={<Editor initialGpx={gpxData} />} />
        </Routes>
    )
}

function App() {
    return (
        <ThemeProvider defaultTheme="system" storageKey="vibe-ui-theme">
            <BrowserRouter>
                <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
                    <ThemeToggle />
                </div>

                <Toaster position="top-center" />

                <AppRoutes />
            </BrowserRouter>
        </ThemeProvider>
    )
}

export default App 
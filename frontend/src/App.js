import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import VideoProctoring from "./components/VideoProctoring";
import Dashboard from "./components/Dashboard";
import Reports from "./components/Reports";
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <div className="App min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/interview/:sessionId" element={<VideoProctoring />} />
          <Route path="/reports/:sessionId" element={<Reports />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;
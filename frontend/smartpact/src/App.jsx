import { Buffer } from 'buffer';
import process from 'process';
import { Transform } from 'stream-browserify';
import React, { useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Dashboard from "./Dashboard";
import AgreementDetails from "./agreementDetails";

window.Buffer = Buffer
window.process = process
window.Transform = Transform

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);

  const handleLoginSuccess = (data) => {
    setIsLoggedIn(true);
    setUserData(data);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserData(null);
  };

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_WEB3AUTH_CLIENT_ID}>
      <Router>
        {isLoggedIn ? (
          <Routes>
            <Route path="/" element={<Dashboard userData={userData} onLogout={handleLogout} />} />
            <Route path="/dashboard" element={<Dashboard userData={userData} onLogout={handleLogout} />} />
            <Route path="/agreements/:id" element={<AgreementDetails userData={userData} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        ) : (
          <Login onLoginSuccess={handleLoginSuccess} />
        )}
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
import React, { useState } from "react";
import axios from "axios";
import { GoogleLogin } from "@react-oauth/google";
import { Buffer } from "buffer";

// Polyfill Buffer for the browser
global.Buffer = Buffer;

const Login = () => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Parse JWT token to extract user information
  const parseToken = (token) => {
    try {
      const base64Url = token.split(".")[1]; // Get the payload part of the token
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(Buffer.from(base64, "base64").toString());
      return payload;
    } catch (err) {
      console.error("Error parsing token:", err);
      return {};
    }
  };

  const onSuccess = async (response) => {
    try {
      setIsLoggingIn(true);
      const idToken = response.credential;
      
      // Send the ID token to the backend
      const backendResponse = await axios.post("http://localhost:5001/login", {
        idToken,
      });

      console.log("Backend response:", backendResponse.data);
      alert(backendResponse.data.message); // Show success message
      setIsLoggingIn(false);
    } catch (error) {
      setIsLoggingIn(false);
      console.error("Google login failed:", error);
      alert("Login failed. Please try again."); // Show error message
    }
  };

  const onError = () => {
    console.error("Login Failed");
    alert("Login failed. Please try again.");
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "'Poppins', sans-serif",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "#fff",
      }}
    >
      {/* Left Section */}
      <div
        style={{
          width: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: "500px",
          }}
        >
          <h1
            style={{
              fontSize: "3rem",
              fontWeight: "bold",
              marginBottom: "20px",
              color: "#fff",
            }}
          >
            Welcome to SmartPact!
          </h1>
          <p
            style={{
              fontSize: "1.2rem",
              color: "#e0e0e0",
              marginBottom: "40px",
            }}
          >
            Securely log in with Google to access your account.
          </p>
          <img
            src="https://via.placeholder.com/400x300"
            alt="Illustration"
            style={{ width: "100%", borderRadius: "10px", boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)" }}
          />
        </div>
      </div>

      {/* Right Section */}
      <div
        style={{
          width: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          borderRadius: "20px 0 0 20px",
          boxShadow: "-10px 0 30px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div
          style={{
            width: "80%",
            maxWidth: "400px",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              marginBottom: "30px",
              color: "#333",
            }}
          >
            Log in
          </h2>
          <div style={{ display: "flex", justifyContent: "center" }}>
            {isLoggingIn ? (
              <p>Logging in...</p>
            ) : (
              <GoogleLogin
                onSuccess={onSuccess}
                onError={onError}
                shape="rectangular"
                size="large"
                text="signin_with"
                theme="outline"
                width="100%"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
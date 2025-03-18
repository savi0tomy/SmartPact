import React from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Login from "./Login"; // Assuming Login component is in this file

function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_WEB3AUTH_CLIENT_ID}>
      <Login />
    </GoogleOAuthProvider>
  );
}

export default App;
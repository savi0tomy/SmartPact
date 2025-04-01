import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Logo from "./assets/LogoDash.png";
import Icon from "./assets/person-circle-icon.png";
import AgreementFlow from "./AgreementFlow";

// Configure axios defaults if not already configured elsewhere
axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:5001';

const Dashboard = ({ userData, onLogout }) => {
  const [showAgreementFlow, setShowAgreementFlow] = useState(false);
  const [agreements, setAgreements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("recent"); // "recent" or "all"

  // Fetch agreements on component mount and when new ones are created
  useEffect(() => {
    fetchAgreements();
  }, [userData]); // Re-fetch when userData changes

  const fetchAgreements = async () => {
    if (!userData?.id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get(`/api/agreements/user/${userData.id}`);
      // Fetch agreements associated with this user
      if (response.data && response.data.success && Array.isArray(response.data.agreements)) {
        const sortedAgreements = response.data.agreements.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setAgreements(sortedAgreements);
      } else {
        setAgreements([]);
      }
    } catch (err) {
      console.error("Failed to fetch agreements:", err);
      setError("Failed to load your agreements. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAgreement = (newAgreement) => {
    // Add the new agreement to the state
    setAgreements([newAgreement, ...agreements]);
    setShowAgreementFlow(false);
  };

  // Filter agreements based on active tab
  const filteredAgreements = activeTab === "recent" 
    ? agreements.slice(0, 5) // Show only the latest 5
    : agreements;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <img src={Logo} alt="Logo" style={styles.logo} />
        <span style={styles.ethBalance}>
          {userData?.walletBalance ? `${userData.walletBalance} ETH` : "Wallet not connected"}
        </span>
        <button style={styles.logoutButton} onClick={onLogout}>
          Logout
        </button>
        <img src={Icon} alt="Icon" style={styles.profileCircle} />
      </div>

      {showAgreementFlow ? (
        <AgreementFlow 
          userData={userData}
          onCreateAgreement={handleCreateAgreement} 
          onCancel={() => setShowAgreementFlow(false)}
        />
      ) : (
        <>
          {/* Welcome Message */}
          <h1 style={styles.welcomeText}>
            Welcome {userData?.name || userData?.email || ""}!
          </h1>
          <button 
            style={styles.createButton} 
            onClick={() => setShowAgreementFlow(true)}
          >
            Create new agreement
          </button>

          {/* Agreements Section */}
          <div style={styles.agreementsContainer}>
            <div style={styles.tabContainer}>
              <button 
                style={{
                  ...styles.tabButton,
                  backgroundColor: activeTab === "recent" ? "#A65DE9" : "white",
                  color: activeTab === "recent" ? "white" : "#A65DE9"
                }} 
                onClick={() => setActiveTab("recent")}
              >
                Recent agreements
              </button>
              <button 
                style={{
                  ...styles.tabButton,
                  backgroundColor: activeTab === "all" ? "#A65DE9" : "white",
                  color: activeTab === "all" ? "white" : "#A65DE9"
                }}
                onClick={() => setActiveTab("all")}
              >
                View all agreements
              </button>
            </div>
            
            {isLoading ? (
              <div style={styles.loadingMessage}>Loading your agreements...</div>
            ) : error ? (
              <div style={styles.errorMessage}>{error}</div>
            ) : filteredAgreements.length > 0 ? (
              // Render existing agreements
              filteredAgreements.map(agreement => (
                <div key={agreement._id} style={styles.agreementCard}>
                  <div style={styles.agreementHeader}>
                    <span style={styles.agreementTypeBadge}>{agreement.type}</span>
                    <span style={{
                      ...styles.agreementStatus,
                      backgroundColor: agreement.status === "Funded" ? "#28A745" : "#FFC107"
                    }}>
                      {agreement.status}
                    </span>
                  </div>
                  {/* Replace <a> with <Link> to avoid page refresh */}
                  <Link to={`/agreements/${agreement._id}`} style={styles.agreementTitle}>
                    {agreement.title}
                  </Link>
                  <p style={styles.parties}>
                    With: {agreement.counterparty.email}
                  </p>
                  <div style={styles.dates}>
                    <span>Start: {new Date(agreement.startDate).toLocaleDateString()}</span>
                    <span>Due: {new Date(agreement.dueDate).toLocaleDateString()}</span>
                  </div>
                  {agreement.amount && (
                    <div style={styles.amount}>
                      Amount: {agreement.amount} ETH
                    </div>
                  )}
                </div>
              ))
            ) : (
              // Empty state
              <div style={styles.emptyState}>
                <p>You don't have any agreements yet.</p>
                <p>Create a new agreement to get started!</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};


// Inline Styles
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    fontFamily: "'Poppins', sans-serif",
    background: "linear-gradient(135deg, #FF8C00, #A65DE9)", // Orange → Purple gradient
    color: "#333",
    paddingTop: "40px",
    minHeight: "100vh", // Changed from height to minHeight
    padding: "20px 0 60px 0", // Added bottom padding
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "90%",
    padding: "15px 20px",
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0px 5px 15px rgba(0,0,0,0.1)",
    marginBottom: "20px",
  },
  logo: {
    width: "40px",
  },
  ethBalance: {
    fontSize: "16px",
    fontWeight: "bold",
  },
  profileCircle: {
    width: "35px",
    height: "35px",
    borderRadius: "50%",
    backgroundColor: "#A65DE9",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
  },
  logoutButton: {
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: "600",
    color: "white",
    background: "#A65DE9",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    marginRight: "10px",
  },
  welcomeText: {
    fontSize: "28px",
    fontWeight: "bold",
    marginBottom: "50px",
    marginTop:"50px",
    color:"#FFFFFF",
  },
  createButton: {
    padding: "12px 24px",
    fontSize: "16px",
    fontWeight: "600",
    color: "#A65DE9",
    border: "2px solid #A65DE9",
    borderRadius: "8px",
    background: "white",
    cursor: "pointer",
    transition: "all 0.3s ease",
    marginBottom: "80px",
  },
  agreementsContainer: {
    width: "80%",
    background: "white",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0px 10px 30px rgba(0,0,0,0.1)",
  },
  tabButton: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "600",
    border: "2px solid #A65DE9",
    borderRadius: "8px",
    background: "white",
    color: "#A65DE9",
    cursor: "pointer",
    margin: "5px",
  },
  agreementCard: {
    marginTop: "20px",
    padding: "15px",
    background: "#f8f8f8",
    borderRadius: "8px",
    boxShadow: "0px 5px 10px rgba(0,0,0,0.1)",
  },
  agreementHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px",
  },
  agreementTypeBadge: {
    padding: "3px 8px",
    backgroundColor: "#6A5ACD",
    color: "white",
    borderRadius: "4px",
    fontSize: "12px",
  },
  agreementStatus: {
    padding: "3px 8px",
    color: "white",
    borderRadius: "4px",
    fontSize: "12px",
  },
  agreementTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#6A5ACD",
    textDecoration: "none",
    display: "block",
    marginBottom: "8px",
  },
  parties: {
    fontSize: "14px",
    marginTop: "5px",
    color: "#555",
  },
  dates: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "8px",
    fontSize: "14px",
    fontWeight: "500",
  },
  amount: {
    marginTop: "8px",
    fontSize: "14px",
    fontWeight: "600",
  },
  emptyState: {
    padding: "30px",
    textAlign: "center",
    color: "#6c757d",
  },
  loadingMessage: {
    padding: "20px",
    textAlign: "center",
    color: "#6c757d",
  },
  errorMessage: {
    padding: "20px",
    textAlign: "center",
    color: "#dc3545",
  },
  tabContainer: {
    display: "flex",
    marginBottom: "20px",
  },
};

// Load Google Font
const link = document.createElement("link");
link.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap";
link.rel = "stylesheet";
document.head.appendChild(link);

export default Dashboard;
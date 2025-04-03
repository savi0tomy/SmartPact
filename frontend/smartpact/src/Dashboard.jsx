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
  const [activeTab, setActiveTab] = useState("all"); // "all" or "requests"
  const [fundingStatus, setFundingStatus] = useState({});

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
    fetchAgreements();
    setShowAgreementFlow(false);
  };

  const handleAcceptAgreement = async (agreementId) => {
    try {
      const response = await axios.post(`/api/agreements/${agreementId}/accept`);
      
      if (response.data.success) {
        setAgreements(prev => 
          prev.map(a => 
            a._id === agreementId 
              ? { ...a, status: "Accepted" } 
              : a
          )
        );
      } else {
        alert(`Failed to accept: ${response.data.message}`);
      }
    } catch (err) {
      console.error("Accept error details:", err.response?.data);
      alert(`Failed to accept agreement: ${err.response?.data?.message || err.message}`);
    }
  };
  
  // Function to determine if user can accept the agreement
  const canAcceptAgreement = (agreement) => {
    return agreement.counterparty._id === userData.id && agreement.status === "Created";
  };

  const handleFundAgreement = async (agreementId) => {
    try {
      setFundingStatus(prev => ({ ...prev, [agreementId]: 'loading' }));
      const response = await axios.post(`/api/agreements/${agreementId}/fund`);
      
      if (response.data && response.data.success) {
        // Update agreement status locally
        setAgreements(agreements.map(agreement => 
          agreement._id === agreementId 
            ? { ...agreement, status: "Funded", fundTxHash: response.data.txHash }
            : agreement
        ));
        setFundingStatus(prev => ({ ...prev, [agreementId]: 'success' }));
      } else {
        setFundingStatus(prev => ({ ...prev, [agreementId]: 'error' }));
        alert(`Funding failed: ${response.data?.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Failed to fund agreement:", err);
      setFundingStatus(prev => ({ ...prev, [agreementId]: 'error' }));
      // Show detailed error message
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error occurred';
      alert(`Failed to fund agreement: ${errorMessage}`);
    }
  };
  
  // MODIFIED: Only the creator can fund, regardless of agreement type
  const canFundAgreement = (agreement) => {
    // Safely check if the user is the creator
    const creatorId = agreement.creator._id || agreement.creator;
    return creatorId === userData.id && agreement.status === "Accepted";
  };

  const getOtherPartyName = (agreement) => {
    // Safeguard against undefined agreement
    if (!agreement) return "Unknown";
    
    // Safely get creator and counterparty info
    const creator = agreement.creator || {};
    const counterparty = agreement.counterparty || {};
    
    // Check if creator is populated (object with _id) or just an ID string
    const isCreatorPopulated = creator && typeof creator === 'object' && creator._id;
    const creatorId = isCreatorPopulated ? creator._id : agreement.creator;
    
    // Check if current user is the creator
    if (creatorId === userData?.id) {
      // Return counterparty info - handle both populated and unpopulated cases
      if (counterparty.email) {
        return counterparty.email;
      }
      return "Counterparty";
    } else {
      // Return creator info
      if (creator.email) {
        return creator.email;
      }
      return "Creator";
    }
  };

  // MODIFIED: Filter agreements for the requests tab to only show "Created" status
  const filteredAgreements = activeTab === "all" 
    ? agreements
    : agreements.filter(agreement => 
        agreement.status === "Created" && agreement.counterparty._id === userData.id
      );

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
                  backgroundColor: activeTab === "all" ? "#A65DE9" : "white",
                  color: activeTab === "all" ? "white" : "#A65DE9"
                }} 
                onClick={() => setActiveTab("all")}
              >
                View all agreements
              </button>
              <button 
                style={{
                  ...styles.tabButton,
                  backgroundColor: activeTab === "requests" ? "#A65DE9" : "white",
                  color: activeTab === "requests" ? "white" : "#A65DE9"
                }}
                onClick={() => setActiveTab("requests")}
              >
                Agreement requests
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
                      backgroundColor: getStatusColor(agreement.status)
                    }}>
                      {agreement.status}
                    </span>
                  </div>
                  {/* Replace <a> with <Link> to avoid page refresh */}
                  <Link to={`/agreements/${agreement._id}`} style={styles.agreementTitle}>
                    {agreement.title}
                  </Link>
                  <p style={styles.parties}>
                    With: {getOtherPartyName(agreement)}
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
                  {canAcceptAgreement(agreement) && (
                    <button 
                      style={styles.acceptButton}
                      onClick={() => handleAcceptAgreement(agreement._id)}
                    >
                      Accept Agreement
                    </button>
                  )}
                  {canFundAgreement(agreement) && (
                    <button 
                      style={styles.fundButton}
                      onClick={() => handleFundAgreement(agreement._id)}
                      disabled={fundingStatus[agreement._id] === 'loading'}
                    >
                      {fundingStatus[agreement._id] === 'loading' ? 'Processing...' : 'Fund Agreement'}
                    </button>
                  )}
                  {fundingStatus[agreement._id] === 'error' && (
                    <div style={styles.errorMessage}>Funding failed. Please try again.</div>
                  )}
                </div>
              ))
            ) : (
              // Empty state
              <div style={styles.emptyState}>
                <p>You don't have any {activeTab === "requests" ? "agreement requests" : "agreements"} yet.</p>
                {activeTab === "all" && <p>Create a new agreement to get started!</p>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Helper function to get status color
const getStatusColor = (status) => {
  switch (status) {
    case "Funded":
      return "#28A745"; // Green
    case "Accepted":
      return "#17A2B8"; // Blue
    case "Created":
      return "#FFC107"; // Yellow
    default:
      return "#6C757D"; // Gray
  }
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
  acceptButton: {
    marginTop: "15px",
    padding: "8px 16px",
    backgroundColor: "#28A745", // Green color
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    width: "100%",
    transition: "background-color 0.3s ease",
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
  fundButton: {
    marginTop: "15px",
    padding: "8px 16px",
    backgroundColor: "#A65DE9",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    width: "100%",
    transition: "background-color 0.3s ease",
  },
};

// Load Google Font
const link = document.createElement("link");
link.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap";
link.rel = "stylesheet";
document.head.appendChild(link);

export default Dashboard;
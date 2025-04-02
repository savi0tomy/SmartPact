import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useEffect, useState } from "react";
import { encrypt,decrypt } from "./encryption";

// Configure axios defaults if not already configured elsewhere
axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:5001';

const AgreementDetails = ({ userData }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [agreement, setAgreement] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [decryptedNames, setDecryptedNames] = useState({
        creatorName: "",
        counterpartyName: ""
    });

    useEffect(() => {
        const fetchAgreement = async () => {
            try {
                setIsLoading(true);
                const response = await axios.get(`/api/agreements/${id}`);
                setAgreement(response.data.agreement);

                // Decrypt names
                const creatorName = await decrypt(response.data.agreement.creator.name);
                const counterpartyName = response.data.agreement.counterparty.name 
                    ? await decrypt(response.data.agreement.counterparty.name)
                    : response.data.agreement.counterparty.email;

                setDecryptedNames({
                    creatorName,
                    counterpartyName
                });
            } catch (err) {
                setError("Failed to load agreement details");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchAgreement();
    }, [id]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    };

    const renderTemplate = () => {
        if (!agreement) return null;
        
        const commonDetails = (
            <>
                <div style={styles.partyDetails}>
                    <div style={styles.party}>
                        <h3>Party A (Creator)</h3>
                        <p>{decryptedNames.creatorName || agreement.creator.email}</p>
                        <p>{agreement.creator.email}</p>
                    </div>
                    <div style={styles.party}>
                        <h3>Party B</h3>
                        <p>{decryptedNames.counterpartyName || agreement.counterparty.email}</p>
                        <p>{agreement.counterparty.email}</p>
                    </div>
                </div>
                <div style={styles.agreementMeta}>
                    <p><strong>Created:</strong> {formatDate(agreement.createdAt || new Date())}</p>
                    <p><strong>Status:</strong> {agreement.status}</p>
                </div>
            </>
        );
        
        switch (agreement.type) {
            case 'Rental':
                return (
                    <div style={styles.template}>
                        <div style={styles.templateHeader}>
                            <h2>RENTAL AGREEMENT</h2>
                        </div>
                        
                        {commonDetails}
                        
                        <div style={styles.section}>
                            <h3>PROPERTY DETAILS</h3>
                            <p><strong>Property Address:</strong> {agreement.details?.address || 'Not specified'}</p>
                            <p><strong>Monthly Rent:</strong> {agreement.amount} ETH</p>
                            <p><strong>Rental Period:</strong> From {formatDate(agreement.startDate)} to {formatDate(agreement.dueDate)}</p>
                        </div>
                        
                        <div style={styles.section}>
                            <h3>TERMS AND CONDITIONS</h3>
                            <p>{agreement.terms || 'No specific terms provided.'}</p>
                        </div>
                        
                        
                    </div>
                );
                
            case 'Freelancer':
                return (
                    <div style={styles.template}>
                        <div style={styles.templateHeader}>
                            <h2>FREELANCER AGREEMENT</h2>
                        </div>
                        
                        {commonDetails}
                        
                        <div style={styles.section}>
                            <h3>PROJECT DETAILS</h3>
                            <p><strong>Project Title:</strong> {agreement.title}</p>
                            <p><strong>Scope of Work:</strong> {agreement.details?.scope || 'Not specified'}</p>
                            <p><strong>Payment Amount:</strong> {agreement.amount} ETH</p>
                            <p><strong>Delivery Date:</strong> {formatDate(agreement.dueDate)}</p>
                            <p><strong>Start Date:</strong> {formatDate(agreement.startDate)}</p>
                        </div>
                        
                        <div style={styles.section}>
                            <h3>DELIVERABLES</h3>
                            <p>{agreement.details?.deliverables || 'Deliverables not specified.'}</p>
                        </div>
                        
                        <div style={styles.section}>
                            <h3>TERMS AND CONDITIONS</h3>
                            <p>{agreement.terms || 'No specific terms provided.'}</p>
                        </div>
                        
                        <div style={styles.signatureSection}>
                            <div style={styles.signature}>
                                <p>_________________________</p>
                                <p>Client Signature</p>
                            </div>
                            <div style={styles.signature}>
                                <p>_________________________</p>
                                <p>Freelancer Signature</p>
                            </div>
                        </div>
                    </div>
                );
                
            case 'Subscription':
                return (
                    <div style={styles.template}>
                        <div style={styles.templateHeader}>
                            <h2>SUBSCRIPTION AGREEMENT</h2>
                        </div>
                        
                        {commonDetails}
                        
                        <div style={styles.section}>
                            <h3>SERVICE DETAILS</h3>
                            <p><strong>Service:</strong> {agreement.title}</p>
                            <p><strong>Monthly Fee:</strong> {agreement.amount} ETH</p>
                            <p><strong>Billing Cycle:</strong> Every {agreement.details?.billingCycle || 'month'}</p>
                            <p><strong>Start Date:</strong> {formatDate(agreement.startDate)}</p>
                        </div>
                        
                        <div style={styles.section}>
                            <h3>SERVICE DESCRIPTION</h3>
                            <p>{agreement.details?.description || 'Service description not provided.'}</p>
                        </div>
                        
                        <div style={styles.section}>
                            <h3>TERMS AND CONDITIONS</h3>
                            <p>{agreement.terms || 'No specific terms provided.'}</p>
                        </div>
                        
                        <div style={styles.signatureSection}>
                            <div style={styles.signature}>
                                <p>_________________________</p>
                                <p>Service Provider Signature</p>
                            </div>
                            <div style={styles.signature}>
                                <p>_________________________</p>
                                <p>Subscriber Signature</p>
                            </div>
                        </div>
                    </div>
                );
                
            default:
                return (
                    <div style={styles.template}>
                        <div style={styles.templateHeader}>
                            <h2>GENERAL AGREEMENT</h2>
                        </div>
                        
                        {commonDetails}
                        
                        <div style={styles.section}>
                            <h3>AGREEMENT DETAILS</h3>
                            <p><strong>Title:</strong> {agreement.title}</p>
                            <p><strong>Amount:</strong> {agreement.amount} ETH</p>
                            <p><strong>Start Date:</strong> {formatDate(agreement.startDate)}</p>
                            <p><strong>Due Date:</strong> {formatDate(agreement.dueDate)}</p>
                        </div>
                        
                        <div style={styles.section}>
                            <h3>TERMS AND CONDITIONS</h3>
                            <p>{agreement.terms || 'No specific terms provided.'}</p>
                        </div>
                        
                        <div style={styles.signatureSection}>
                            <div style={styles.signature}>
                                <p>_________________________</p>
                                <p>Party A Signature</p>
                            </div>
                            <div style={styles.signature}>
                                <p>_________________________</p>
                                <p>Party B Signature</p>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    if (isLoading) return <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading agreement details...</p>
    </div>;
    
    if (error) return <div style={styles.errorContainer}>
        <h2>Error</h2>
        <p>{error}</p>
        <button style={styles.backButton} onClick={() => navigate(-1)}>
            ← Back to Dashboard
        </button>
    </div>;

    if (!agreement) return <div style={styles.errorContainer}>
        <h2>Agreement Not Found</h2>
        <p>The requested agreement could not be found.</p>
        <button style={styles.backButton} onClick={() => navigate(-1)}>
            ← Back to Dashboard
        </button>
    </div>;

    return (
        <div style={styles.container}>
            <button style={styles.backButton} onClick={() => navigate(-1)}>
                ← Back to Dashboard
            </button>
            
            <div style={styles.header}>
                <h1>{agreement.title}</h1>
                <div style={{
                    ...styles.statusBadge,
                    backgroundColor: getStatusColor(agreement.status)
                }}>
                    {agreement.status}
                </div>
            </div>
            
            {renderTemplate()}
            
            <div style={styles.actions}>
                {agreement.status === 'Created' && agreement.creator._id === userData.id && (
                    <button style={styles.actionButton}>Fund Agreement</button>
                )}
                {agreement.status === 'Funded' && (
                    <button style={styles.actionButton}>
                        {userData.id === agreement.creator._id ? 'Release Funds' : 'Request Payment'}
                    </button>
                )}
            </div>
        </div>
    );
};

// Helper function to get status color
const getStatusColor = (status) => {
    switch (status) {
        case 'Created':
            return '#FFC107'; // Yellow
        case 'Funded':
            return '#28A745'; // Green
        case 'Completed':
            return '#17A2B8'; // Teal
        case 'Disputed':
            return '#DC3545'; // Red
        default:
            return '#6C757D'; // Gray
    }
};

const styles = {
    container: {
        padding: '30px',
        maxWidth: '900px',
        margin: '0 auto',
        fontFamily: "'Poppins', sans-serif",
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '50vh',
        textAlign: 'center',
    },
    spinner: {
        border: '4px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '50%',
        borderTop: '4px solid #A65DE9',
        width: '40px',
        height: '40px',
        animation: 'spin 1s linear infinite',
        marginBottom: '20px',
    },
    errorContainer: {
        padding: '30px',
        maxWidth: '900px',
        margin: '0 auto',
        textAlign: 'center',
        color: '#DC3545',
    },
    backButton: {
        padding: '10px 20px',
        marginBottom: '20px',
        background: '#A65DE9',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'background 0.3s ease',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        padding: '0 0 15px 0',
        borderBottom: '1px solid #eee',
    },
    statusBadge: {
        padding: '8px 15px',
        color: 'white',
        borderRadius: '4px',
        fontWeight: 'bold',
        fontSize: '14px',
    },
    template: {
        padding: '30px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        marginBottom: '30px',
        backgroundColor: 'white',
    },
    templateHeader: {
        textAlign: 'center',
        marginBottom: '30px',
        padding: '0 0 15px 0',
        borderBottom: '2px solid #A65DE9',
    },
    partyDetails: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
    },
    party: {
        width: '45%',
    },
    agreementMeta: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '20px',
        padding: '10px 0',
        borderBottom: '1px dashed #ddd',
    },
    section: {
        marginBottom: '25px',
        padding: '0 0 15px 0',
        borderBottom: '1px solid #eee',
    },
    signatureSection: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '40px',
        paddingTop: '20px',
        borderTop: '1px solid #eee',
    },
    signature: {
        width: '45%',
        textAlign: 'center',
    },
    actions: {
        display: 'flex',
        justifyContent: 'flex-end',
    },
    actionButton: {
        padding: '12px 24px',
        background: '#A65DE9',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '16px',
        transition: 'background 0.3s ease',
    },
};

export default AgreementDetails;
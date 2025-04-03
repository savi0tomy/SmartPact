import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useEffect, useState } from "react";
import { encrypt, decrypt } from "./encryption";

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

 // Render template based on agreement type
 const renderTemplate = () => {
 if (!agreement) return null;

 // Get today's date as effective date if not provided
 const effectiveDate = formatDate(agreement.createdAt || new Date());

 // Determine party names and roles based on agreement type
 let party1Role, party2Role, party1Name, party2Name;

 switch (agreement.type) {
 case 'Rental Agreement':
 party1Role = "LESSOR";
 party2Role = "LESSEE";
 party1Name = decryptedNames.creatorName || agreement.creator.email;
 party2Name = decryptedNames.counterpartyName || agreement.counterparty.email;
 return (
 <div style={templateStyles.document}>
 <h1 style={templateStyles.title}>RENTAL AGREEMENT</h1>

 <div style={templateStyles.content}>
 <p>THIS ONLINE RENTAL AGREEMENT ("AGREEMENT") IS MADE AND ENTERED INTO AS OF {effectiveDate}, BY AND BETWEEN:</p>
 <p>{party1Role}: {party1Name}, HEREINAFTER REFERRED TO AS THE "LESSOR," AND</p>
 <p>{party2Role}: {party2Name}, HEREINAFTER REFERRED TO AS THE "LESSEE."</p>

 <ol style={templateStyles.sections}>
 <li>
 <p>RENTAL PROPERTY DETAILS THE LESSOR AGREES TO RENT THE FOLLOWING PROPERTY TO THE LESSEE:</p>
 <ul style={templateStyles.bulletList}>
 <li>PROPERTY ADDRESS: {agreement.propertyAddress || 'No address provided'}</li>
 <li>TERMS: {agreement.terms || 'No property type specified'}</li>
 <li>RENTAL PERIOD: {formatDate(agreement.startDate)} TO {formatDate(agreement.dueDate)}</li>
 <li>MONTHLY RENT: {agreement.amount} (ETH OR OTHER CURRENCY)</li>
 </ul>
 </li>

 <li>
 <p>PAYMENT TERMS</p>
 <ul style={templateStyles.bulletList}>
 <li>RENT PAYMENT: THE LESSEE WILL TRANSFER THE RENT AMOUNT FROM THEIR WALLET (INTEGRATED INTO THE SYSTEM) TO AN INTERIM WALLET AT THE BEGINNING OF EACH RENTAL PERIOD.</li>
 <li>PAYMENT RELEASE: UPON COMPLETION OF THE RENTAL PERIOD OR ONGOING USAGE APPROVAL, THE RENT WILL BE TRANSFERRED TO THE LESSOR'S WALLET.</li>
 <li>NO DELAYS: PAYMENTS WILL BE PROCESSED AUTOMATICALLY UPON APPROVAL.</li>
 </ul>
 </li>

 <li>
 <p>SECURITY DEPOSIT</p>
 <ul style={templateStyles.bulletList}>
 <li>DEPOSIT AMOUNT: {agreement.securityDeposit || 'No deposit specified'}</li>
 <li>THE DEPOSIT WILL BE HELD IN AN INTERIM WALLET AND REFUNDED TO THE LESSEE UPON AGREEMENT COMPLETION, MINUS ANY APPLICABLE DEDUCTIONS FOR DAMAGES OR UNPAID RENT.</li>
 </ul>
 </li>

 <li>
 <p>MAINTENANCE & RESPONSIBILITIES</p>
 <ul style={templateStyles.bulletList}>
 <li>THE LESSOR IS RESPONSIBLE FOR MAJOR REPAIRS AND STRUCTURAL MAINTENANCE.</li>
 <li>THE LESSEE IS RESPONSIBLE FOR GENERAL UPKEEP AND MINOR REPAIRS.</li>
 <li>ADDITIONAL TERMS: {agreement.details?.additionalTerms || 'No additional terms specified'}</li>
 </ul>
 </li>

 <li>
 <p>TERMINATION CLAUSE</p>
 <ul style={templateStyles.bulletList}>
 <li>IF THE LESSEE FAILS TO MAKE PAYMENTS ON TIME, THE AGREEMENT WILL BE TERMINATED, AND THE PROPERTY ACCESS MAY BE REVOKED.</li>
 <li>THE LESSOR MAY TERMINATE THE AGREEMENT BY PROVIDING {agreement.details?.noticePeriod || 'reasonable'} NOTICE IF THE LESSEE VIOLATES TERMS.</li>
 </ul>
 </li>

 <li>
 <p>ACCESS & USAGE RESTRICTIONS</p>
 <ul style={templateStyles.bulletList}>
 <li>THE PROPERTY SHALL ONLY BE USED FOR {agreement.details?.purpose || 'the agreed-upon'} PURPOSES.</li>
 <li>THE LESSEE SHALL NOT SUBLET OR TRANSFER THE AGREEMENT WITHOUT PRIOR APPROVAL.</li>
 </ul>
 </li>

 <li>
 <p>CONFIDENTIALITY & PRIVACY</p>
 <p>BOTH PARTIES AGREE TO PROTECT ANY SHARED PERSONAL OR CONTRACTUAL INFORMATION FROM UNAUTHORIZED DISCLOSURE.</p>
 </li>

 <li>
 <p>ENTIRE AGREEMENT</p>
 <p>THIS AGREEMENT CONSTITUTES THE ENTIRE UNDERSTANDING BETWEEN BOTH PARTIES AND SUPERSEDES ANY PRIOR DISCUSSIONS. NO GOVERNING LAW OR DISPUTE RESOLUTION SYSTEM APPLIES.</p>
 </li>
 </ol>
 </div>
 </div>
 );

 case 'Freelancer':
 case 'Software Freelancing':
 party1Role = "CLIENT";
 party2Role = "FREELANCER";
 party1Name = decryptedNames.creatorName || agreement.creator.email;
 party2Name = decryptedNames.counterpartyName || agreement.counterparty.email;
 return (
 <div style={templateStyles.document}>
 <h1 style={templateStyles.title}>SOFTWARE FREELANCING</h1>

 <div style={templateStyles.content}>
 <p>THIS SOFTWARE FREELANCING AGREEMENT ("AGREEMENT") IS MADE AND ENTERED INTO AS OF {effectiveDate}, BY AND BETWEEN:</p>
 <p>{party1Role}: {party1Name}, HEREINAFTER REFERRED TO AS THE "CLIENT," AND</p>
 <p>{party2Role}: {party2Name}, HEREINAFTER REFERRED TO AS THE "FREELANCER."</p>

 <ol style={templateStyles.sections}>
 <li>
 <p>SCOPE OF WORK: THE FREELANCER AGREES TO PROVIDE THE FOLLOWING SOFTWARE DEVELOPMENT SERVICES TO THE CLIENT:</p>
 <ul style={templateStyles.bulletList}>
 <li>DELIVERABLES: {agreement.deliverables || 'No specific deliverables listed'}</li>
 <li>MILESTONES: {agreement.milestones || 'Not specified'}</li>
 <li>REQUIREMENTS: {agreement.terms || 'No additional requirements specified'}</li>
 </ul>
 </li>

 <li>
 <p>PAYMENT TERMS:</p>
 <ul style={templateStyles.bulletList}>
 <li>TOTAL COMPENSATION: {agreement.amount} (ETH OR OTHER CURRENCY)</li>
 <li>PAYMENT PROCESS: ONCE THE AGREEMENT IS APPROVED, THE FUNDS WILL BE TRANSFERRED FROM THE CLIENT'S WALLET (INTEGRATED INTO THE SYSTEM) TO A INTERIM WALLET. UPON FINAL APPROVAL OF THE WORK, THE FUNDS WILL BE TRANSFERRED TO THE FREELANCER'S WALLET.</li>
 <li>NO DELAYS: PAYMENT WILL BE PROCESSED AUTOMATICALLY UPON APPROVAL.</li>
 </ul>
 </li>

 <li>
 <p>TIMELINE & DELIVERABLES:</p>
 <ul style={templateStyles.bulletList}>
 <li>PROJECT START DATE: {formatDate(agreement.startDate)}</li>
 <li>PROJECT DEADLINE: {formatDate(agreement.dueDate)}</li>
 <li>MILESTONES: {agreement.details?.milestones || 'No specific milestones defined'}</li>
 </ul>
 </li>

 <li>
 <p>APPROVAL PROCESS:</p>
 <ul style={templateStyles.bulletList}>
 <li>THE FREELANCER WILL SUBMIT THE COMPLETED WORK TO THE CLIENT FOR REVIEW.</li>
 <li>THE CLIENT WILL CONDUCT A QUALITY CHECK FOR ERRORS AND ADHERENCE TO REQUIREMENTS.</li>
 <li>UPON APPROVAL, FUNDS WILL BE TRANSFERRED FROM THE INTERIM WALLET TO THE FREELANCER'S WALLET.</li>
 </ul>
 </li>

 <li>
 <p>OWNERSHIP & INTELLECTUAL PROPERTY RIGHTS:</p>
 <ul style={templateStyles.bulletList}>
 <li>THE CLIENT SHALL OWN ALL INTELLECTUAL PROPERTY RIGHTS TO THE FINAL DELIVERABLES UPON FULL PAYMENT.</li>
 <li>THE FREELANCER RETAINS THE RIGHT TO USE PROJECT MATERIALS IN A PORTFOLIO UNLESS OTHERWISE AGREED IN WRITING.</li>
 </ul>
 </li>

 <li>
 <p>CONFIDENTIALITY: BOTH PARTIES AGREE NOT TO DISCLOSE CONFIDENTIAL INFORMATION SHARED DURING THE COURSE OF THE PROJECT.</p>
 </li>

 <li>
 <p>TERMINATION CLAUSE:</p>
 <ul style={templateStyles.bulletList}>
 <li>IF THE FREELANCER FAILS TO DELIVER THE PROJECT WITHIN THE AGREED TIMEFRAME, THE AGREEMENT WILL BE TERMINATED, AND THE FUNDS WILL BE REFUNDED TO THE CLIENT.</li>
 </ul>
 </li>

 <li>
 <p>ENTIRE AGREEMENT: THIS AGREEMENT CONSTITUTES THE ENTIRE UNDERSTANDING BETWEEN BOTH PARTIES AND SUPERSEDES ANY PRIOR DISCUSSIONS. NO GOVERNING LAW OR DISPUTE RESOLUTION SYSTEM APPLIES.</p>
 </li>
 </ol>
 </div>
 </div>
 );

 case 'Subscription':
 case 'Subscription Agreement':
 party1Role = "SERVICE PROVIDER";
 party2Role = "SUBSCRIBER";
 party1Name = decryptedNames.creatorName || agreement.creator.email;
 party2Name = decryptedNames.counterpartyName || agreement.counterparty.email;
 return (
 <div style={templateStyles.document}>
 <h1 style={templateStyles.title}>SUBSCRIPTION AGREEMENT</h1>

 <div style={templateStyles.content}>
 <p>THIS SUBSCRIPTION AGREEMENT ("AGREEMENT") IS MADE AND ENTERED INTO AS OF {effectiveDate}, BY AND BETWEEN:</p>
 <p>{party1Role}: {party1Name}, HEREINAFTER REFERRED TO AS THE "PROVIDER," AND</p>
 <p>{party2Role}: {party2Name}, HEREINAFTER REFERRED TO AS THE "SUBSCRIBER."</p>

 <ol style={templateStyles.sections}>
 <li>
 <p>SUBSCRIPTION DETAILS</p>
 <ul style={templateStyles.bulletList}>
 <li>SERVICE PROVIDED: {agreement.subscriptionDetails || 'Service not specified'}</li>
 <li>SUBSCRIPTION TERMS: {agreement.terms || 'Not specified'}</li>
 <li>BILLING CYCLE: {Math.floor(agreement.billingInterval/86400)+ ' days' || 'Not specified'}</li>
 <li>ACCESS DURATION: {formatDate(agreement.startDate)} TO {formatDate(agreement.dueDate)}</li>
 </ul>
 </li>

 <li>
 <p>PAYMENT TERMS</p>
 <ul style={templateStyles.bulletList}>
 <li>TOTAL SUBSCRIPTION FEE: {agreement.amount} (ETH OR OTHER CURRENCY)</li>
 <li>PAYMENT METHOD: FUNDS ARE TRANSFERRED FROM THE SUBSCRIBER'S WALLET TO THE INTERIM WALLET AT THE START OF EACH BILLING CYCLE.</li>
 <li>AUTOMATIC RENEWAL: {agreement.details?.autoRenewal === true ? 'YES' :
 agreement.details?.autoRenewal === false ? 'NO' :
 'Not specified'}</li>
 </ul>
 </li>

 <li>
 <p>SERVICE ACCESS & USAGE</p>
 <ul style={templateStyles.bulletList}>
 <li>THE SUBSCRIBER WILL RECEIVE ACCESS TO THE SERVICE UPON SUCCESSFUL PAYMENT.</li>
 <li>THE SERVICE IS FOR {agreement.details?.usageType || 'PERSONAL/BUSINESS'} USE ONLY AND CANNOT BE RESOLD OR SHARED UNLESS SPECIFIED.</li>
 </ul>
 </li>

 <li>
 <p>CANCELLATION & REFUNDS</p>
 <ul style={templateStyles.bulletList}>
 <li>THE SUBSCRIBER MAY CANCEL THE SUBSCRIPTION AT ANY TIME BEFORE THE NEXT BILLING CYCLE.</li>
 <li>NO REFUNDS WILL BE PROVIDED FOR THE CURRENT BILLING PERIOD.</li>
 <li>IF THE PROVIDER TERMINATES THE SERVICE, A PRO-RATA REFUND MAY BE ISSUED.</li>
 </ul>
 </li>

 <li>
 <p>INTELLECTUAL PROPERTY RIGHTS</p>
 <ul style={templateStyles.bulletList}>
 <li>ALL CONTENT AND MATERIALS PROVIDED UNDER THE SUBSCRIPTION REMAIN THE PROPERTY OF THE PROVIDER.</li>
 <li>THE SUBSCRIBER IS GRANTED A LIMITED, NON-TRANSFERABLE LICENSE TO USE THE SERVICE.</li>
 </ul>
 </li>

 <li>
 <p>CONFIDENTIALITY</p>
 <ul style={templateStyles.bulletList}>
 <li>BOTH PARTIES AGREE NOT TO DISCLOSE CONFIDENTIAL INFORMATION SHARED DURING THE SUBSCRIPTION PERIOD.</li>
 </ul>
 </li>

 <li>
 <p>TERMINATION</p>
 <ul style={templateStyles.bulletList}>
 <li>THE SUBSCRIPTION MAY BE TERMINATED IF THE SUBSCRIBER FAILS TO MAKE PAYMENT.</li>
 <li>VIOLATION OF TERMS MAY RESULT IN IMMEDIATE SUSPENSION WITHOUT REFUND.</li>
 </ul>
 </li>

 <li>
 <p>ENTIRE AGREEMENT</p>
 <p>THIS AGREEMENT CONSTITUTES THE ENTIRE UNDERSTANDING BETWEEN BOTH PARTIES AND SUPERSEDES ANY PRIOR DISCUSSIONS. NO GOVERNING LAW OR DISPUTE RESOLUTION SYSTEM APPLIES.</p>
 </li>
 </ol>
 </div>
 </div>
 );

 default:
 party1Role = "PARTY A";
 party2Role = "PARTY B";
 party1Name = decryptedNames.creatorName || agreement.creator.email;
 party2Name = decryptedNames.counterpartyName || agreement.counterparty.email;
 return (
 <div style={templateStyles.document}>
 <h1 style={templateStyles.title}>GENERAL AGREEMENT</h1>

 <div style={templateStyles.content}>
 <p>THIS AGREEMENT IS MADE AND ENTERED INTO AS OF {effectiveDate}, BY AND BETWEEN:</p>
 <p>{party1Role}: {party1Name}</p>
 <p>{party2Role}: {party2Name}</p>

 <ol style={templateStyles.sections}>
 <li>
 <p>AGREEMENT DETAILS</p>
 <ul style={templateStyles.bulletList}>
 <li>TITLE: {agreement.title}</li>
 <li>AMOUNT: {agreement.amount} (ETH OR OTHER CURRENCY)</li>
 <li>START DATE: {formatDate(agreement.startDate)}</li>
 <li>END DATE: {formatDate(agreement.dueDate)}</li>
 <li>DESCRIPTION: {agreement.details?.description || 'No description provided'}</li>
 </ul>
 </li>

 <li>
 <p>TERMS AND CONDITIONS</p>
 <p>{agreement.terms || 'No specific terms provided.'}</p>
 </li>

 <li>
 <p>PAYMENT TERMS</p>
 <ul style={templateStyles.bulletList}>
 <li>PAYMENT PROCESS: FUNDS WILL BE TRANSFERRED FROM THE PAYER'S WALLET TO AN INTERIM WALLET AND THEN TO THE PAYEE'S WALLET UPON COMPLETION.</li>
 <li>PAYMENT SCHEDULE: {agreement.details?.paymentSchedule || 'As agreed between both parties.'}</li>
 </ul>
 </li>

 <li>
 <p>CONFIDENTIALITY</p>
 <p>BOTH PARTIES AGREE TO PROTECT ANY SHARED PERSONAL OR CONTRACTUAL INFORMATION FROM UNAUTHORIZED DISCLOSURE.</p>
 </li>

 <li>
 <p>ENTIRE AGREEMENT</p>
 <p>THIS AGREEMENT CONSTITUTES THE ENTIRE UNDERSTANDING BETWEEN BOTH PARTIES AND SUPERSEDES ANY PRIOR DISCUSSIONS. NO GOVERNING LAW OR DISPUTE RESOLUTION SYSTEM APPLIES.</p>
 </li>
 </ol>
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

// Styles for the container and UI elements
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
 actions: {
 display: 'flex',
 justifyContent: 'flex-end',
 marginTop: '30px',
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

// Styles specifically for the agreement template
const templateStyles = {
 document: {
 fontFamily: "'Poppins', sans-serif",
 backgroundColor: '#f5f0e6', // Cream/beige background
 padding: '40px',
 borderRadius: '8px',
 boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
 color: '#333',
 lineHeight: '1.5',
 },
 title: {
 textAlign: 'center',
 fontSize: '28px',
 fontWeight: 'bold',
 marginBottom: '40px',
 letterSpacing: '1px',
 },
 content: {
 marginTop: '20px',
 },
 sections: {
 listStyleType: 'decimal',
 paddingLeft: '30px',
 marginTop: '30px',
 },
 bulletList: {
 listStyleType: 'disc',
 marginLeft: '30px',
 marginTop: '10px',
 marginBottom: '20px',
 },
};

export default AgreementDetails;
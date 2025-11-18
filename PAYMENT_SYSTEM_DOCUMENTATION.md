# SCIS Payment & Membership Verification System

## 📋 Overview

This document describes the complete payment verification system for SCIS membership applications and upgrades.

## 💰 Membership Fee Structure

| Membership Type | Fee (INR) | Description |
|----------------|-----------|-------------|
| **Student UG** | ₹250 | Undergraduate students |
| **Student PG** | ₹350 | Postgraduate students |
| **Academic** | ₹500 | Academic professionals |
| **Industry** | ₹750 | Industry professionals |
| **International** | ₹600 | Non-Indian residents |

## 🏦 Bank Details for Payment

**Account Name:** Society for cyber intelligent systems  
**Account Number:** 8067349218  
**IFSC Code:** IDIB000R076  
**Bank Name:** Indian Bank  
**Branch:** Reddiyarpalayam, Puducherry  
**UPI ID:** societyforcyber@indianbk

## 🔄 Payment Flow

### For New Membership

```
1. User fills membership form
   ↓
2. System calculates fee based on membership type
   ↓
3. User sees payment details (QR Code + Bank Details)
   ↓
4. User makes payment via UPI/Bank Transfer
   ↓
5. User uploads payment screenshot
   ↓
6. User marks "Payment Done"
   ↓
7. System creates PaymentVerification record (status: pending)
   ↓
8. Admin reviews payment in admin panel
   ↓
9. Admin approves/rejects payment
   ↓
10. If approved: Membership activated + ID card generated
    If rejected: User notified with reason
```

### For Membership Upgrade

```
1. User requests upgrade to higher tier
   ↓
2. System shows new fee for upgraded tier
   ↓
3. User makes payment
   ↓
4. User submits payment proof
   ↓
5. Admin verifies and approves
   ↓
6. Membership type updated + New ID card issued
```

## 🛠️ API Endpoints

### Public Endpoints

#### Get All Membership Fees
```http
GET /api/payment/fees
```

**Response:**
```json
{
  "success": true,
  "fees": {
    "student-ug": 250,
    "student-pg": 350,
    "academic": 500,
    "industry": 750,
    "international": 600
  },
  "currency": "INR",
  "paymentDetails": {
    "accountName": "Society for cyber intelligent systems",
    "accountNumber": "8067349218",
    "ifscCode": "IDIB000R076",
    "bankName": "Indian Bank",
    "branch": "Reddiyarpalayam, Puducherry",
    "upiId": "societyforcyber@indianbk"
  }
}
```

#### Get Specific Membership Fee
```http
GET /api/payment/fees/:type
```

**Parameters:**
- `type`: `student-ug`, `student-pg`, `academic`, `industry`, `international`

**Response:**
```json
{
  "success": true,
  "membershipType": "student-ug",
  "fee": 250,
  "currency": "INR"
}
```

---

### Protected Endpoints (Requires Authentication)

#### Submit Payment Verification
```http
POST /api/payment/verify
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "membershipId": "64f8a9c7e1234567890abcde",
  "transactionId": "UPI1234567890",
  "paymentMethod": "upi",
  "paymentScreenshot": "base64_encoded_image_or_url",
  "remarks": "Paid via Google Pay"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verification submitted successfully. Awaiting admin approval.",
  "data": {
    "verificationId": "64f8a9c7e1234567890abcdf",
    "status": "pending"
  }
}
```

#### Submit Upgrade Payment Verification
```http
POST /api/payment/verify/upgrade
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "membershipId": "64f8a9c7e1234567890abcde",
  "newMembershipType": "industry",
  "transactionId": "UPI9876543210",
  "paymentMethod": "bank-transfer",
  "paymentScreenshot": "base64_image",
  "remarks": "Upgrading from academic to industry"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Upgrade payment verification submitted successfully. Awaiting admin approval.",
  "data": {
    "verificationId": "64f8a9c7e1234567890abce0",
    "status": "pending",
    "previousType": "academic",
    "newType": "industry",
    "amount": 750
  }
}
```

#### Get Verification Status by Membership ID
```http
GET /api/payment/verify/membership/:membershipId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "hasVerification": true,
  "verification": {
    "id": "64f8a9c7e1234567890abcdf",
    "status": "pending",
    "amount": 250,
    "paymentMethod": "upi",
    "submittedAt": "2024-11-18T10:30:00.000Z",
    "verifiedAt": null,
    "adminRemarks": null,
    "isUpgrade": false
  }
}
```

---

### Admin Endpoints (Requires Admin Role)

#### Get All Payment Verifications
```http
GET /api/payment/verify/all?status=pending&isUpgrade=false
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `status` (optional): `pending`, `approved`, `rejected`
- `isUpgrade` (optional): `true`, `false`

**Response:**
```json
{
  "success": true,
  "verifications": [
    {
      "_id": "64f8a9c7e1234567890abcdf",
      "membershipId": {
        "_id": "64f8a9c7e1234567890abcde",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "membershipId": "SOCCOS-2411-1234",
        "membershipType": "student-ug"
      },
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "membershipType": "student-ug",
      "amount": 250,
      "paymentMethod": "upi",
      "transactionId": "UPI1234567890",
      "paymentScreenshot": "https://cloudinary.com/...",
      "remarks": "Paid via Google Pay",
      "verificationStatus": "pending",
      "isUpgrade": false,
      "createdAt": "2024-11-18T10:30:00.000Z"
    }
  ],
  "total": 15
}
```

#### Get Payment Verification by ID
```http
GET /api/payment/verify/:id
Authorization: Bearer <admin_token>
```

#### Approve Payment Verification
```http
POST /api/payment/verify/:id/approve
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "adminRemarks": "Payment verified successfully"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified and membership activated successfully",
  "verification": { ... },
  "membership": { ... }
}
```

#### Reject Payment Verification
```http
POST /api/payment/verify/:id/reject
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "adminRemarks": "Invalid transaction ID or payment proof"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verification rejected",
  "verification": { ... }
}
```

#### Get Payment Verification Statistics
```http
GET /api/admin/stats/payment-verifications
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 150,
    "pending": 25,
    "approved": 115,
    "rejected": 10
  }
}
```

---

## 📊 Database Models

### PaymentVerification Schema

```javascript
{
  membershipId: ObjectId (ref: 'Membership'),
  userId: ObjectId (ref: 'User'),
  email: String,
  firstName: String,
  lastName: String,
  membershipType: String (enum),
  amount: Number,
  paymentMethod: String (enum: 'qr-code', 'bank-transfer', 'upi'),
  transactionId: String,
  paymentScreenshot: String (Cloudinary URL),
  remarks: String,
  verificationStatus: String (enum: 'pending', 'approved', 'rejected'),
  verifiedBy: ObjectId (ref: 'User'),
  verifiedAt: Date,
  adminRemarks: String,
  isUpgrade: Boolean,
  previousMembershipType: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Updated Membership Schema Fields

```javascript
{
  // ... existing fields ...
  membershipType: {
    type: String,
    enum: ['student-ug', 'student-pg', 'academic', 'industry', 'international']
  },
  membershipFee: Number,
  paymentStatus: {
    type: String,
    enum: ['pending', 'verified', 'completed', 'rejected'],
    default: 'pending'
  },
  paymentVerificationId: ObjectId (ref: 'PaymentVerification')
}
```

---

## 🎯 Payment Status Flow

### Membership Payment Statuses

1. **pending** - Initial state, payment not yet submitted
2. **verified** - User submitted payment proof, awaiting admin review
3. **completed** - Admin approved payment, membership active
4. **rejected** - Admin rejected payment, user needs to resubmit

### Verification Statuses

1. **pending** - Awaiting admin review
2. **approved** - Admin approved, membership activated
3. **rejected** - Admin rejected with reason

---

## 🖼️ Payment Screenshot Handling

Payment screenshots are uploaded to Cloudinary with the following specifications:

- **Format**: Base64 encoded image or direct file upload
- **Max Size**: 10MB
- **Allowed Formats**: JPG, JPEG, PNG
- **Storage**: Cloudinary cloud storage
- **URL**: Returned as secure HTTPS URL

---

## 🔐 Security Features

1. **JWT Authentication** - All user actions require valid JWT token
2. **Admin Authorization** - Verification approval/rejection requires admin role
3. **File Upload Validation** - Screenshots validated before upload
4. **Rate Limiting** - Prevent spam submissions
5. **Audit Trail** - All actions logged with timestamps and user IDs

---

## 📱 Frontend Integration Guide

### Step 1: Display Payment Information

```javascript
// Fetch membership fees
const response = await fetch('/api/payment/fees');
const { fees, paymentDetails } = await response.json();

// Display QR Code
<QRCode value={`upi://pay?pa=${paymentDetails.upiId}&pn=${paymentDetails.accountName}`} />

// Display Bank Details
<div>
  <p>Account: {paymentDetails.accountNumber}</p>
  <p>IFSC: {paymentDetails.ifscCode}</p>
  <p>Bank: {paymentDetails.bankName}</p>
</div>
```

### Step 2: Submit Payment Verification

```javascript
const submitPayment = async (membershipId, screenshot, transactionId) => {
  const formData = {
    membershipId,
    transactionId,
    paymentMethod: 'upi',
    paymentScreenshot: screenshot, // base64 or file
    remarks: 'Payment completed'
  };

  const response = await fetch('/api/payment/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(formData)
  });

  return await response.json();
};
```

### Step 3: Check Verification Status

```javascript
const checkStatus = async (membershipId) => {
  const response = await fetch(`/api/payment/verify/membership/${membershipId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return await response.json();
};
```

---

## 🎨 Admin Panel UI Requirements

### Payment Verification Dashboard

**Required Components:**

1. **Statistics Cards**
   - Total verifications
   - Pending verifications
   - Approved verifications
   - Rejected verifications

2. **Verification List Table**
   - Columns: Name, Email, Type, Amount, Status, Date, Actions
   - Filters: Status, Date range, Membership type
   - Search: By name, email, transaction ID

3. **Verification Detail Modal**
   - Member information
   - Payment details
   - Transaction ID
   - Payment screenshot (enlargeable)
   - User remarks
   - Approve/Reject buttons
   - Admin remarks input

4. **Actions**
   - View payment screenshot
   - Approve with remarks
   - Reject with reason (required)
   - View member profile
   - Download receipt

---

## 🧪 Testing Guide

### Test Cases

1. **New Membership Payment**
   - Submit payment for student-ug (₹250)
   - Verify admin can see in pending list
   - Admin approves
   - Check membership status = 'completed'
   - Verify ID card is generated

2. **Membership Upgrade**
   - Submit upgrade from academic to industry
   - Verify correct fee difference
   - Admin approves
   - Check membership type updated

3. **Payment Rejection**
   - Submit payment with invalid screenshot
   - Admin rejects with remarks
   - Verify user receives rejection reason
   - User can resubmit

4. **Edge Cases**
   - Duplicate submission prevention
   - Invalid membership ID
   - Missing required fields
   - Invalid image format

---

## 📝 Notes

- Payment verification is manual and requires admin approval
- Users can upload payment screenshot up to 10MB
- Membership is activated only after admin approval
- ID card generation happens automatically after approval
- Rejection requires admin remarks (mandatory)
- Users can resubmit after rejection

---

## 🚀 Deployment Checklist

- [ ] Update `.env` with Cloudinary credentials
- [ ] Test payment flow end-to-end
- [ ] Verify QR code generation
- [ ] Test admin approval/rejection
- [ ] Check email notifications (if implemented)
- [ ] Verify ID card generation after approval
- [ ] Test upgrade flow
- [ ] Load test with multiple concurrent submissions

---

## 📞 Support

For issues or questions, contact: societyforcis.org@gmail.com

# 🚀 Quick Start Guide - SCIS Payment System

## ⚡ Installation & Setup (5 minutes)

### 1. Backend Setup

```bash
cd SCIS-Backend
npm install
```

### 2. Environment Variables

Make sure your `.env` file has:

```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# Cloudinary (for payment screenshot storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT
JWT_SECRET=your_jwt_secret

# Server
PORT=5000
NODE_ENV=development
```

### 3. Start Backend Server

```bash
npm start
# or for development
npm run dev
```

Server will start on `http://localhost:5000`

---

## 🧪 Testing the APIs

### 1. Test Payment Fees Endpoint (Public - No Auth)

```bash
curl http://localhost:5000/api/payment/fees
```

**Expected Response:**
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

### 2. Test Specific Fee

```bash
curl http://localhost:5000/api/payment/fees/student-ug
```

### 3. Test User Authentication Flow

First, login to get token:

```bash
curl -X POST http://localhost:5000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your_email@example.com",
    "password": "your_password"
  }'
```

Save the `token` from response.

### 4. Submit Payment Verification (Requires Auth)

```bash
curl -X POST http://localhost:5000/api/payment/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "membershipId": "YOUR_MEMBERSHIP_ID",
    "transactionId": "UPI1234567890",
    "paymentMethod": "upi",
    "remarks": "Paid via Google Pay"
  }'
```

### 5. Admin: Get All Pending Verifications

```bash
curl http://localhost:5000/api/payment/verify/all?status=pending \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

### 6. Admin: Approve Payment

```bash
curl -X POST http://localhost:5000/api/payment/verify/VERIFICATION_ID/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE" \
  -d '{
    "adminRemarks": "Payment verified successfully"
  }'
```

---

## 📱 Frontend Integration Steps

### Step 1: Install Required Packages

```bash
cd SCIS-Frontend
npm install qrcode.react
# (if not already installed)
```

### Step 2: Create Payment Service

Create `src/services/paymentService.ts`:

```typescript
import axios from 'axios';

const API_BASE = '/api/payment';

export const paymentService = {
  // Get all membership fees
  getAllFees: async () => {
    const response = await axios.get(`${API_BASE}/fees`);
    return response.data;
  },

  // Submit payment verification
  submitPayment: async (data: {
    membershipId: string;
    transactionId: string;
    paymentMethod: string;
    paymentScreenshot?: string;
    remarks?: string;
  }) => {
    const response = await axios.post(`${API_BASE}/verify`, data);
    return response.data;
  },

  // Check verification status
  getVerificationStatus: async (membershipId: string) => {
    const response = await axios.get(`${API_BASE}/verify/membership/${membershipId}`);
    return response.data;
  },

  // Admin: Get all verifications
  getAllVerifications: async (filters?: { status?: string; isUpgrade?: boolean }) => {
    const response = await axios.get(`${API_BASE}/verify/all`, { params: filters });
    return response.data;
  },

  // Admin: Approve verification
  approveVerification: async (id: string, adminRemarks?: string) => {
    const response = await axios.post(`${API_BASE}/verify/${id}/approve`, { adminRemarks });
    return response.data;
  },

  // Admin: Reject verification
  rejectVerification: async (id: string, adminRemarks: string) => {
    const response = await axios.post(`${API_BASE}/verify/${id}/reject`, { adminRemarks });
    return response.data;
  }
};
```

### Step 3: Create Payment Page Component

Create `src/pages/MembershipPayment.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import { paymentService } from '../services/paymentService';

const MembershipPayment = ({ membershipId, membershipType }) => {
  const [fees, setFees] = useState<any>(null);
  const [screenshot, setScreenshot] = useState<string>('');
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFees();
  }, []);

  const loadFees = async () => {
    const data = await paymentService.getAllFees();
    setFees(data);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await paymentService.submitPayment({
        membershipId,
        transactionId,
        paymentMethod: 'upi',
        paymentScreenshot: screenshot,
        remarks: 'Payment completed via UPI'
      });
      
      alert('Payment verification submitted! Awaiting admin approval.');
    } catch (error) {
      console.error(error);
      alert('Error submitting payment verification');
    } finally {
      setLoading(false);
    }
  };

  if (!fees) return <div>Loading...</div>;

  const amount = fees.fees[membershipType];
  const upiString = `upi://pay?pa=${fees.paymentDetails.upiId}&pn=${fees.paymentDetails.accountName}&am=${amount}&cu=INR`;

  return (
    <div className="payment-page">
      <h2>Complete Your Payment</h2>
      
      <div className="fee-info">
        <h3>Membership Fee: ₹{amount}</h3>
        <p>Type: {membershipType}</p>
      </div>

      <div className="payment-methods">
        {/* QR Code Section */}
        <div className="qr-section">
          <h3>Scan QR Code to Pay</h3>
          <QRCode value={upiString} size={256} />
          <p>Scan with any UPI app</p>
        </div>

        {/* Bank Details Section */}
        <div className="bank-details">
          <h3>Or Transfer to Bank Account</h3>
          <div className="detail-row">
            <span>Account Name:</span>
            <strong>{fees.paymentDetails.accountName}</strong>
          </div>
          <div className="detail-row">
            <span>Account Number:</span>
            <strong>{fees.paymentDetails.accountNumber}</strong>
          </div>
          <div className="detail-row">
            <span>IFSC Code:</span>
            <strong>{fees.paymentDetails.ifscCode}</strong>
          </div>
          <div className="detail-row">
            <span>Bank:</span>
            <strong>{fees.paymentDetails.bankName}</strong>
          </div>
          <div className="detail-row">
            <span>Branch:</span>
            <strong>{fees.paymentDetails.branch}</strong>
          </div>
          <div className="detail-row">
            <span>UPI ID:</span>
            <strong>{fees.paymentDetails.upiId}</strong>
          </div>
        </div>
      </div>

      {/* Upload Payment Proof */}
      <div className="upload-section">
        <h3>Upload Payment Screenshot</h3>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload}
        />
        {screenshot && (
          <div className="preview">
            <img src={screenshot} alt="Payment proof" style={{ maxWidth: '300px' }} />
          </div>
        )}
      </div>

      {/* Transaction ID */}
      <div className="transaction-id">
        <label>Transaction ID (Optional):</label>
        <input 
          type="text" 
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value)}
          placeholder="Enter UPI/Bank transaction ID"
        />
      </div>

      {/* Submit Button */}
      <button 
        onClick={handleSubmit} 
        disabled={!screenshot || loading}
        className="submit-btn"
      >
        {loading ? 'Submitting...' : 'Confirm Payment Done'}
      </button>
    </div>
  );
};

export default MembershipPayment;
```

### Step 4: Create Admin Payment Management Component

Create `src/pages/admin/PaymentVerifications.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { paymentService } from '../../services/paymentService';

const PaymentVerifications = () => {
  const [verifications, setVerifications] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [selectedVerification, setSelectedVerification] = useState<any>(null);
  const [adminRemarks, setAdminRemarks] = useState('');

  useEffect(() => {
    loadVerifications();
  }, [filter]);

  const loadVerifications = async () => {
    const data = await paymentService.getAllVerifications({ status: filter });
    setVerifications(data.verifications);
  };

  const handleApprove = async (id: string) => {
    try {
      await paymentService.approveVerification(id, adminRemarks);
      alert('Payment approved successfully!');
      loadVerifications();
      setSelectedVerification(null);
    } catch (error) {
      alert('Error approving payment');
    }
  };

  const handleReject = async (id: string) => {
    if (!adminRemarks) {
      alert('Please provide remarks for rejection');
      return;
    }
    
    try {
      await paymentService.rejectVerification(id, adminRemarks);
      alert('Payment rejected');
      loadVerifications();
      setSelectedVerification(null);
    } catch (error) {
      alert('Error rejecting payment');
    }
  };

  return (
    <div className="payment-verifications">
      <h2>Payment Verifications</h2>

      {/* Filters */}
      <div className="filters">
        <button onClick={() => setFilter('pending')}>Pending</button>
        <button onClick={() => setFilter('approved')}>Approved</button>
        <button onClick={() => setFilter('rejected')}>Rejected</button>
        <button onClick={() => setFilter('')}>All</button>
      </div>

      {/* Verifications Table */}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Transaction ID</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {verifications.map((v: any) => (
            <tr key={v._id}>
              <td>{v.firstName} {v.lastName}</td>
              <td>{v.email}</td>
              <td>{v.membershipType}</td>
              <td>₹{v.amount}</td>
              <td>{v.transactionId || 'N/A'}</td>
              <td>
                <span className={`badge ${v.verificationStatus}`}>
                  {v.verificationStatus}
                </span>
              </td>
              <td>{new Date(v.createdAt).toLocaleDateString()}</td>
              <td>
                <button onClick={() => setSelectedVerification(v)}>
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Detail Modal */}
      {selectedVerification && (
        <div className="modal">
          <div className="modal-content">
            <h3>Verification Details</h3>
            
            <div className="details">
              <p><strong>Name:</strong> {selectedVerification.firstName} {selectedVerification.lastName}</p>
              <p><strong>Email:</strong> {selectedVerification.email}</p>
              <p><strong>Type:</strong> {selectedVerification.membershipType}</p>
              <p><strong>Amount:</strong> ₹{selectedVerification.amount}</p>
              <p><strong>Transaction ID:</strong> {selectedVerification.transactionId}</p>
              <p><strong>Payment Method:</strong> {selectedVerification.paymentMethod}</p>
              <p><strong>User Remarks:</strong> {selectedVerification.remarks}</p>
            </div>

            {selectedVerification.paymentScreenshot && (
              <div className="screenshot">
                <h4>Payment Screenshot:</h4>
                <img 
                  src={selectedVerification.paymentScreenshot} 
                  alt="Payment proof" 
                  style={{ maxWidth: '100%', maxHeight: '400px' }}
                />
              </div>
            )}

            {selectedVerification.verificationStatus === 'pending' && (
              <div className="actions">
                <textarea
                  placeholder="Admin remarks (optional for approval, required for rejection)"
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                />
                
                <div className="buttons">
                  <button 
                    className="approve-btn"
                    onClick={() => handleApprove(selectedVerification._id)}
                  >
                    Approve Payment
                  </button>
                  
                  <button 
                    className="reject-btn"
                    onClick={() => handleReject(selectedVerification._id)}
                    disabled={!adminRemarks}
                  >
                    Reject Payment
                  </button>
                </div>
              </div>
            )}

            <button onClick={() => setSelectedVerification(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentVerifications;
```

---

## 🎨 Basic CSS (Optional)

```css
/* Payment Page Styles */
.payment-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.payment-methods {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin: 30px 0;
}

.qr-section {
  text-align: center;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.bank-details {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin: 10px 0;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
}

.upload-section {
  margin: 20px 0;
}

.submit-btn {
  width: 100%;
  padding: 15px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  cursor: pointer;
}

.submit-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Admin Panel Styles */
.badge {
  padding: 5px 10px;
  border-radius: 3px;
  font-size: 12px;
}

.badge.pending {
  background: #FFA500;
  color: white;
}

.badge.approved {
  background: #4CAF50;
  color: white;
}

.badge.rejected {
  background: #F44336;
  color: white;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 8px;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}
```

---

## ✅ Testing Checklist

- [ ] Backend server starts without errors
- [ ] GET `/api/payment/fees` returns correct fees
- [ ] User can submit payment verification
- [ ] Screenshot uploads to Cloudinary
- [ ] Admin can see pending verifications
- [ ] Admin can approve verification
- [ ] Admin can reject verification with remarks
- [ ] Membership status updates after approval
- [ ] ID card can be generated after approval

---

## 🐛 Troubleshooting

### Issue: Cloudinary upload fails
**Solution:** Check `.env` has correct Cloudinary credentials

### Issue: 401 Unauthorized
**Solution:** Make sure JWT token is valid and included in Authorization header

### Issue: Payment verification not showing in admin panel
**Solution:** Check user has admin role (`isAdmin: true`)

### Issue: QR code not scanning
**Solution:** Verify UPI ID format and amount are correct

---

## 📚 Documentation References

- Full API Docs: `PAYMENT_SYSTEM_DOCUMENTATION.md`
- Architecture: `ARCHITECTURE.md`
- Implementation Details: `IMPLEMENTATION_SUMMARY.md`

---

## 🎉 You're All Set!

The payment system is now fully functional. Users can:
1. ✅ See membership fees
2. ✅ Make payments via UPI/Bank
3. ✅ Upload payment proof
4. ✅ Track verification status

Admins can:
1. ✅ View all payment verifications
2. ✅ Approve/reject payments
3. ✅ Add remarks
4. ✅ Generate membership cards after approval

**Happy Coding! 🚀**

# 💰 SCIS Membership Pricing Structure

## Final Pricing (Confirmed)

| Membership Type | Price (INR) | Duration | Description |
|----------------|-------------|----------|-------------|
| **Student UG** | ₹250 | 1 Year | Undergraduate students |
| **Student PG** | ₹350 | 1 Year | Postgraduate/Masters students |
| **Academic** | ₹500 | 1 Year | Faculty, Researchers & Academics |
| **Industry** | ₹750 | 1 Year | Industry Professionals |
| **International** | ₹600 | 1 Year | Non-Indian Residents (Global) |

---

## Membership Benefits

### 🎓 Student UG (₹250/year)
- ✅ Access to research papers
- ✅ Student networking events
- ✅ Basic cybersecurity resources
- ✅ Monthly newsletter

### 🎓 Student PG (₹350/year)
- ✅ All UG benefits
- ✅ Advanced research access
- ✅ Conference discounts
- ✅ Mentorship opportunities

### 👨‍🏫 Academic (₹500/year)
- ✅ All student benefits
- ✅ Professional certification
- ✅ Research collaboration platform
- ✅ Priority conference registration
- ✅ Publication opportunities

### 🏢 Industry (₹750/year)
- ✅ All professional benefits
- ✅ Industry networking events
- ✅ Advanced research access
- ✅ Career development resources
- ✅ Priority support
- ✅ Custom research reports

### 🌍 International (₹600/year)
- ✅ All core benefits
- ✅ Global networking access
- ✅ Virtual conference participation
- ✅ International collaboration platform
- ✅ Regional support

---

## API Response Format

### Get All Membership Types

```http
GET /api/membership/types
```

**Response:**
```json
{
  "success": true,
  "membershipTypes": [
    {
      "value": "student-ug",
      "label": "Student Membership (UG)",
      "description": "For Undergraduate Students",
      "fee": 250,
      "duration": "1 Year",
      "benefits": [
        "Access to research papers",
        "Student networking events",
        "Basic cybersecurity resources",
        "Monthly newsletter"
      ]
    },
    {
      "value": "student-pg",
      "label": "Student Membership (PG)",
      "fee": 350,
      "duration": "1 Year"
    },
    {
      "value": "academic",
      "label": "Academic Membership",
      "fee": 500,
      "duration": "1 Year"
    },
    {
      "value": "industry",
      "label": "Industry Membership",
      "fee": 750,
      "duration": "1 Year"
    },
    {
      "value": "international",
      "label": "International Membership",
      "fee": 600,
      "duration": "1 Year"
    }
  ],
  "currency": "INR"
}
```

---

## Payment Details

### Bank Transfer
- **Account Name:** Society for cyber intelligent systems
- **Account Number:** 8067349218
- **IFSC Code:** IDIB000R076
- **Bank:** Indian Bank
- **Branch:** Reddiyarpalayam, Puducherry

### UPI Payment
- **UPI ID:** societyforcyber@indianbk

### QR Code
Generate UPI QR code with format:
```
upi://pay?pa=societyforcyber@indianbk&pn=Society for cyber intelligent systems&am={amount}&cu=INR
```

---

## Database Enum Values

```javascript
membershipType: {
  type: String,
  enum: ['student-ug', 'student-pg', 'academic', 'industry', 'international']
}
```

---

## Automatic Type Conversion

The system automatically converts old membership types:

| Old Value | New Value |
|-----------|-----------|
| `student` | `student-ug` |
| `professional` | `academic` |
| `corporate` | `industry` |

---

## Frontend Integration

### Fetch Membership Types

```javascript
const getMembershipTypes = async () => {
  const response = await fetch('/api/membership/types');
  const data = await response.json();
  return data.membershipTypes;
};
```

### Display Pricing Cards

```jsx
{membershipTypes.map(type => (
  <div key={type.value} className="membership-card">
    <h3>{type.label}</h3>
    <p className="price">₹{type.fee}/{type.duration}</p>
    <p>{type.description}</p>
    <ul>
      {type.benefits.map(benefit => (
        <li key={benefit}>✅ {benefit}</li>
      ))}
    </ul>
    <button onClick={() => selectPlan(type.value)}>
      Choose Plan
    </button>
  </div>
))}
```

---

## Notes

1. All prices are in **Indian Rupees (INR)**
2. Membership duration is **1 year** from approval date
3. International members pay in **INR** (₹600) regardless of location
4. Prices include all taxes
5. Membership renewal follows the same pricing

---

**Last Updated:** 18 November 2025

# Simple Dodo Payments Setup Guide

This guide shows how to set up a simple single product purchase flow using Dodo Payments.

## 🚀 Quick Setup

### 1. Environment Variables in Render

Set these environment variables in your Render dashboard:

```bash
# Existing Supabase config
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Dodo Payments config (matching your Render setup)
DODO_PAYMENTS_API_KEY=your_api_key_from_dashboard
DODO_WEBHOOK_SECRET=your_webhook_secret_from_dashboard

# Server config
PORT=3000
NODE_ENV=production
```

### 2. Database Setup

Run this SQL in your Supabase dashboard:

```sql
-- Copy and paste the contents of supabase-simple-payments-schema.sql
-- This creates just the user_payments table
```

### 3. Configure Webhook in Dodo Dashboard

1. Go to Settings > Webhooks in your Dodo dashboard
2. Add webhook URL: `https://your-app-name.onrender.com/api/payments/webhook`
3. Select events:
   - `payment.succeeded`
   - `payment.failed`

### 4. Your Product ID

The app is already configured to use your product ID: `pdt_UrKdEbkyutltGJe3i5Zdy`

## 🛒 How It Works

### Simple Flow:
1. User clicks "🛒 Store" button (top left)
2. Store modal shows the Premium Access product
3. User clicks "Purchase Now"
4. User is redirected to Dodo checkout
5. After payment, user returns to app
6. Webhook updates payment status
7. Success modal shows

### UI Elements:
- **Store Button**: Orange button in top left corner
- **Store Modal**: Simple product card with single item
- **Purchase Flow**: Direct to Dodo checkout
- **Success Modal**: Confirmation after purchase

## 🔧 API Endpoints

- **POST** `/api/payments/create` - Creates payment link
- **POST** `/api/payments/webhook` - Handles Dodo webhooks
- **GET** `/api/payments/history` - Gets user's payment history
- **GET** `/payment-success` - Success page redirect

## 🎨 Store Button Location

The store button is positioned in the header, to the left of the user email:

```
🛒 Store    user@example.com    + New Note    💾 Save All    Logout
```

## 💳 Testing

Use Dodo's test cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`

## 📊 Analytics Events

The app tracks these events:
- `Store Modal Opened`
- `Purchase Initiated`
- `Purchase Success`
- `Purchase Error`

## 🐛 Troubleshooting

### Common Issues:

1. **Store button not showing**: Check if user is logged in
2. **Purchase not working**: Verify environment variables are set correctly
3. **Webhook not working**: Check webhook URL and secret in Dodo dashboard

### Check Server Logs:
- Payment creation logs
- Webhook processing logs
- Error messages

## 📱 Mobile Responsive

The store modal and button are fully responsive and work on mobile devices.

## 🔗 Files Modified

- `public/index.html` - Added store button and modal
- `public/styles.css` - Added store button and product card styles
- `public/script.js` - Added store functionality
- `server.js` - Updated environment variables and simplified payment handling

---

**Your app is now ready with a simple single product purchase flow!**

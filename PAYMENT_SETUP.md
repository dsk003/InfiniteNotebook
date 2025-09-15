# Dodo Payments Integration Setup Guide

This guide will help you set up Dodo Payments for subscription and single product purchases in your InfiniteNotebook app.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

The app now includes the `dodopayments` SDK for handling payments.

### 2. Set Up Dodo Payments Account

1. **Create Account**: Sign up at [Dodo Payments](https://dodopayments.com)
2. **Get API Keys**: 
   - Go to Settings > API in your Dodo dashboard
   - Copy your API Key and Webhook Secret
3. **Create Products**: 
   - Create products in your Dodo dashboard
   - Note the product IDs (you'll need these for the frontend)

### 3. Configure Environment Variables

Update your environment variables (in Render or your `.env` file):

```bash
# Existing Supabase config
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# New Dodo Payments config
DODO_PAYMENTS_API_KEY=your_dodo_payments_api_key
DODO_PAYMENTS_WEBHOOK_SECRET=your_dodo_payments_webhook_secret

# Server config
PORT=3000
NODE_ENV=production
```

### 4. Set Up Database Tables

Run the SQL migration in your Supabase dashboard:

```sql
-- Copy and paste the contents of supabase-payments-schema.sql
-- This creates the necessary tables for payments, subscriptions, and user profiles
```

### 5. Configure Webhooks in Dodo Dashboard

1. Go to Settings > Webhooks in your Dodo dashboard
2. Add webhook URL: `https://your-app-domain.com/api/payments/webhook`
3. Select events to listen for:
   - `payment.succeeded`
   - `payment.failed`
   - `subscription.active`
   - `subscription.cancelled`

### 6. Update Product IDs in Frontend

Edit `/public/index.html` and update the product IDs in the pricing options:

```html
<!-- Update these data-product-id values with your actual Dodo product IDs -->
<div class="pricing-option" data-product-id="your-monthly-product-id">
    <h4>Monthly</h4>
    <div class="price">$9.99/month</div>
    <button class="btn btn-premium btn-full purchase-btn" data-product-id="your-monthly-product-id">
        Choose Monthly
    </button>
</div>
<div class="pricing-option recommended" data-product-id="your-yearly-product-id">
    <div class="recommended-badge">Most Popular</div>
    <h4>Yearly</h4>
    <div class="price">$99.99/year</div>
    <div class="savings">Save 17%!</div>
    <button class="btn btn-premium btn-full purchase-btn" data-product-id="your-yearly-product-id">
        Choose Yearly
    </button>
</div>
```

## 🔧 API Endpoints

The following payment endpoints are now available:

### Create Payment
- **POST** `/api/payments/create`
- Creates a payment link for single purchases
- Requires authentication
- Body: `{ productId, quantity?, returnUrl? }`

### Webhook Handler
- **POST** `/api/payments/webhook`
- Handles Dodo payment webhooks
- Verifies webhook signatures
- Updates payment and subscription status

### Payment Status
- **GET** `/api/payments/status`
- Returns user's payment and subscription status
- Requires authentication

## 💳 How It Works

### Single Product Purchase Flow

1. User clicks "Choose Monthly" or "Choose Yearly"
2. Frontend calls `/api/payments/create` with product ID
3. Server creates payment link via Dodo API
4. User is redirected to Dodo checkout page
5. After payment, user returns to `/payment-success`
6. Webhook updates payment status in database
7. User gets premium access

### Subscription Flow

1. Similar to single purchase, but with recurring billing
2. Webhooks handle subscription renewals and cancellations
3. Premium access is maintained while subscription is active

## 🎨 UI Features

### Payment Modal
- Beautiful pricing cards with feature lists
- Responsive design for mobile and desktop
- Loading states during payment processing
- Success and error handling

### Premium User Indicators
- Premium badge next to user email
- Star icon for premium users
- Hide upgrade button for premium users

## 🔒 Security

- Webhook signature verification
- Row Level Security (RLS) on database tables
- User authentication required for all payment operations
- Secure token handling

## 🐛 Testing

### Test Cards (Dodo Payments)
Use these test card numbers in development:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- Use any future expiration date and any 3-digit CVV

### Test Flow
1. Create test products in Dodo dashboard
2. Update product IDs in frontend
3. Test payment flow with test cards
4. Verify webhooks are received and processed

## 🚀 Deployment on Render

### Environment Variables in Render
1. Go to your Render service dashboard
2. Navigate to Environment tab
3. Add all the environment variables listed above
4. Deploy your app

### Webhook URL
Your webhook URL will be: `https://your-app-name.onrender.com/api/payments/webhook`

## 📊 Analytics

The app includes Amplitude tracking for payment events:
- Payment modal opened
- Payment initiated
- Payment success/failure
- Premium activation

## 🆘 Troubleshooting

### Common Issues

1. **Webhook not working**: 
   - Check webhook URL is correct
   - Verify webhook secret matches
   - Check server logs for errors

2. **Payment not completing**:
   - Verify product IDs are correct
   - Check Dodo dashboard for payment status
   - Ensure webhook events are being sent

3. **Premium status not updating**:
   - Check database tables were created correctly
   - Verify webhook is processing successfully
   - Check user_profiles table for premium status

### Logs
Check server logs for detailed error messages:
- Payment creation errors
- Webhook processing errors
- Database operation errors

## 📚 Next Steps

### Subscription Management
- Add subscription cancellation UI
- Show subscription details and next billing date
- Handle subscription plan changes

### Advanced Features
- Multiple pricing tiers
- Coupon codes and discounts
- Usage-based billing
- Team/organization accounts

## 🔗 Resources

- [Dodo Payments Documentation](https://docs.dodopayments.com)
- [Dodo Payments Dashboard](https://app.dodopayments.com)
- [Supabase Documentation](https://supabase.com/docs)

---

**Need Help?** Check the server logs and Dodo dashboard for debugging information, or refer to the Dodo Payments support documentation.

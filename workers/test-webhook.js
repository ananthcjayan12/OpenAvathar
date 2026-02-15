#!/usr/bin/env node

/**
 * Test script for Gumroad webhook
 * 
 * Usage:
 *   node test-webhook.js [worker-url]
 * 
 * Example:
 *   node test-webhook.js http://localhost:8787
 */

const WORKER_URL = process.argv[2] || 'http://localhost:8787';

// Sample Gumroad webhook payload (form-urlencoded format)
const samplePayload = new URLSearchParams({
    sale_id: 'test-sale-' + Date.now(),
    sale_timestamp: new Date().toISOString(),
    order_number: '12345',
    seller_id: 'seller123',
    product_id: 'prod_abc123',
    product_permalink: 'https://gumroad.com/l/openavathar',
    short_product_id: 'openavathar',
    product_name: 'OpenAvathar Pro (Lifetime)',
    email: 'test@example.com',
    full_name: 'Test User',
    purchaser_id: 'purchaser123',
    ip_country: 'US',
    price: '9900', // $99.00 in cents
    currency: 'usd',
    license_key: 'OAVT-TEST-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    quantity: '1',
    test: 'true', // Mark as test purchase
    refunded: 'false',
    can_contact: 'true',
}).toString();

console.log('🚀 Testing Gumroad Webhook');
console.log('📍 Worker URL:', WORKER_URL);
console.log('📦 Payload:', samplePayload);
console.log('');

fetch(`${WORKER_URL}/api/gumroad/webhook`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Note: In production, Gumroad will send X-Gumroad-Signature header
        // For local testing without signature verification, you may need to temporarily disable it
    },
    body: samplePayload,
})
    .then(async (response) => {
        console.log('✅ Response Status:', response.status, response.statusText);
        const text = await response.text();
        console.log('📄 Response Body:', text);

        if (response.ok) {
            console.log('');
            console.log('✨ Webhook processed successfully!');
            console.log('💡 Check your Cloudflare KV dashboard or logs to verify the license was stored.');
        } else {
            console.log('');
            console.log('❌ Webhook failed. Check the worker logs for details.');
        }
    })
    .catch((error) => {
        console.error('❌ Error:', error.message);
        console.log('');
        console.log('💡 Make sure the worker is running with: npm run dev');
    });

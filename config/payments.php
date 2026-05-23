<?php

return [
    'default_provider' => env('PAYMENT_PROVIDER', 'razorpay'),

    'plans' => [
        'starter' => [
            'name' => 'Starter',
            'description' => 'For early teams sending their first campaigns.',
            'currency' => env('PAYMENT_STARTER_CURRENCY', 'INR'),
            'amount_minor' => (int) env('PAYMENT_STARTER_AMOUNT_MINOR', 199900),
            'interval' => 'month',
            'emails_limit' => 25000,
            'sort_order' => 10,
            'features' => [
                '25,000 emails per month',
                'Basic campaign analytics',
                'Shared sending infrastructure',
            ],
        ],
        'pro' => [
            'name' => 'Pro',
            'description' => 'For growing teams that need higher volume and better controls.',
            'currency' => env('PAYMENT_PRO_CURRENCY', 'INR'),
            'amount_minor' => (int) env('PAYMENT_PRO_AMOUNT_MINOR', 499900),
            'interval' => 'month',
            'emails_limit' => 100000,
            'sort_order' => 20,
            'features' => [
                '100,000 emails per month',
                'Advanced analytics',
                'Priority email support',
            ],
        ],
        'scale' => [
            'name' => 'Scale',
            'description' => 'For teams running high-volume campaigns across multiple segments.',
            'currency' => env('PAYMENT_SCALE_CURRENCY', 'INR'),
            'amount_minor' => (int) env('PAYMENT_SCALE_AMOUNT_MINOR', 999900),
            'interval' => 'month',
            'emails_limit' => 250000,
            'sort_order' => 30,
            'features' => [
                '250,000 emails per month',
                'Dedicated onboarding support',
                'Higher throughput sending',
            ],
        ],
        'manual_test' => [
            'name' => 'Manual Test',
            'description' => 'Internal test plan for payment verification.',
            'currency' => env('PAYMENT_MANUAL_TEST_CURRENCY', 'INR'),
            'amount_minor' => (int) env('PAYMENT_MANUAL_TEST_AMOUNT_MINOR', 100),
            'interval' => 'month',
            'emails_limit' => 100,
            'sort_order' => 999,
            'is_public' => false,
            'features' => [
                'Internal testing only',
            ],
        ],
    ],
];

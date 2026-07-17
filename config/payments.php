<?php

return [
    'default_provider' => env('PAYMENT_PROVIDER', 'razorpay'),

    // Core list of features in the system
    'features' => [
        'ai_generation' => [
            'name' => 'AI Email Copy Assistant',
            'description' => 'Generate and rewrite email copy with AI.',
        ],
        'custom_domain' => [
            'name' => 'Custom Sender Domain',
            'description' => 'Verify and send using your own branded domain.',
        ],
        'track_conversions' => [
            'name' => 'Conversion Tracking',
            'description' => 'Track business conversions driven by your campaigns.',
        ],
        'advanced_analytics' => [
            'name' => 'Advanced Analytics',
            'description' => 'In-depth hierarchical campaign performance reporting.',
        ],
    ],

    'plans' => [
        'free' => [
            'name' => 'Free',
            'description' => 'Default workspace access before a paid plan is activated.',
            'currency' => 'INR',
            'amount_minor' => 0,
            'interval' => 'month',
            'emails_limit' => 500,
            'sort_order' => 1,
            'is_public' => false,
            'features' => [
                '500 emails per month',
                'Basic workspace access',
                '1 Custom Domain limit',
                '2 free AI copy generations',
            ],
            'feature_keys' => [
                'custom_domain' => ['is_enabled' => 1, 'limit_value' => 1],
                'ai_generation' => ['is_enabled' => 1, 'limit_value' => 2],
            ],
        ],
        'starter' => [
            'name' => 'Starter',
            'description' => 'For early teams sending their first campaigns.',
            'currency' => env('PAYMENT_STARTER_CURRENCY', 'INR'),
            'amount_minor' => (int) env('PAYMENT_STARTER_AMOUNT_MINOR', 49900),
            'interval' => 'month',
            'emails_limit' => 5000,
            'sort_order' => 10,
            'features' => [
                '5,000 emails per month',
                'Basic campaign analytics',
                'Shared sending infrastructure',
                '3 Custom Domain limit',
                '5 AI copy generations per month',
            ],
            'feature_keys' => [
                'custom_domain' => ['is_enabled' => 1, 'limit_value' => 3],
                'ai_generation' => ['is_enabled' => 1, 'limit_value' => 5],
            ],
        ],
        'pro' => [
            'name' => 'Pro',
            'description' => 'For growing teams that need higher volume and better controls.',
            'currency' => env('PAYMENT_PRO_CURRENCY', 'INR'),
            'amount_minor' => (int) env('PAYMENT_PRO_AMOUNT_MINOR', 99900),
            'interval' => 'month',
            'emails_limit' => 20000,
            'sort_order' => 20,
            'features' => [
                '20,000 emails per month',
                'Advanced analytics',
                'Priority email support',
                'Unlimited Custom Domains',
                '100 AI copy generations per month',
                'Conversion tracking',
            ],
            'feature_keys' => [
                'custom_domain' => ['is_enabled' => 1, 'limit_value' => null],
                'ai_generation' => ['is_enabled' => 1, 'limit_value' => 100],
                'track_conversions' => ['is_enabled' => 1, 'limit_value' => null],
                'advanced_analytics' => ['is_enabled' => 1, 'limit_value' => null],
            ],
        ],
        'scale' => [
            'name' => 'Scale',
            'description' => 'For teams running high-volume campaigns across multiple segments.',
            'currency' => env('PAYMENT_SCALE_CURRENCY', 'INR'),
            'amount_minor' => (int) env('PAYMENT_SCALE_AMOUNT_MINOR', 999900),
            'interval' => 'month',
            'emails_limit' => 1000000,
            'sort_order' => 30,
            'features' => [
                '250,000 emails per month',
                'Dedicated onboarding support',
                'Higher throughput sending',
                'Unlimited Custom Domains',
                'Unlimited AI copy generations',
                'Conversion tracking',
                'Advanced analytics',
            ],
            'feature_keys' => [
                'custom_domain' => ['is_enabled' => 1, 'limit_value' => null],
                'ai_generation' => ['is_enabled' => 1, 'limit_value' => null],
                'track_conversions' => ['is_enabled' => 1, 'limit_value' => null],
                'advanced_analytics' => ['is_enabled' => 1, 'limit_value' => null],
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
            'feature_keys' => [
                'custom_domain' => ['is_enabled' => 1, 'limit_value' => 1],
                'ai_generation' => ['is_enabled' => 1, 'limit_value' => 5],
            ],
        ],
    ],
];

<?php

return [
    'default_provider' => env('PAYMENT_PROVIDER', 'razorpay'),

    'plans' => [
        'manual_test' => [
            'currency' => env('PAYMENT_MANUAL_TEST_CURRENCY', 'INR'),
            'amount_minor' => (int) env('PAYMENT_MANUAL_TEST_AMOUNT_MINOR', 100),
        ],
    ],
];

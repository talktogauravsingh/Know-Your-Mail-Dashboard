<?php

return [
    'base_url' => env('EMAIL_AI_URL', 'http://localhost:8000'),
    'api_key'  => env('EMAIL_AI_API_KEY'),
    'timeout'  => env('EMAIL_AI_TIMEOUT', 10),
];

<?php

namespace App\Http\Requests\Spam;

use Illuminate\Foundation\Http\FormRequest;

class AnalyzeFullIntelligenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'raw_email' => ['required', 'string', 'max:500000'], // Allows up to 500KB raw email
            'headers' => ['sometimes', 'array'],
            'sender_domain' => ['required', 'string', 'max:255', 'regex:/^(?!\-)(?:[a-zA-Z\d\-]{0,62}[a-zA-Z\d]\.){1,126}(?!\d+)[a-zA-Z\d]{1,63}$/'],
        ];
    }
}

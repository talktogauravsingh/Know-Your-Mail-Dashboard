<?php

namespace App\Http\Requests\Spam;

use Illuminate\Foundation\Http\FormRequest;

class AnalyzeContentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'subject' => ['sometimes', 'string', 'max:255'],
            'content' => ['required', 'string', 'max:50000'],
        ];
    }

    public function prepareForValidation()
    {
        // Example: Sanitize inputs early to prevent large payloads bypassing limits
        if ($this->has('content') && is_string($this->content)) {
            $this->merge([
                'content' => strip_tags($this->content) // Ensure basic sanitization
            ]);
        }
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SpamCheckEmailAIRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'subject' => ['sometimes', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'use_ai' => ['sometimes', 'boolean'],
        ];
    }
}

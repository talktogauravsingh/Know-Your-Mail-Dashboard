<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GenerateEmailAIRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'goal' => ['sometimes', 'string', 'max:255'],
            'tone' => ['sometimes', 'string', 'max:255'],
            'audience' => ['sometimes', 'string', 'max:255'],
            'context' => ['required', 'string'],
            'variants' => ['sometimes', 'integer', 'min:1', 'max:5'],
            'async' => ['sometimes', 'boolean'],
            'char_limit' => ['sometimes', 'integer', 'nullable', 'min:50', 'max:5000'],
        ];
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RewriteEmailAIRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'content' => ['required', 'string'],
            'tone' => ['sometimes', 'string', 'max:255'],
            'correct_grammar' => ['sometimes', 'boolean'],
        ];
    }
}

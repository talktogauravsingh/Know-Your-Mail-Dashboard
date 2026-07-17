<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEmailTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'template_name' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z0-9\s\-_]*$/'],
            'slug' => ['required', 'string', 'max:255', 'alpha_dash', 'unique:email_templates,slug'],
            'category' => ['nullable', 'string', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'preview_text' => ['nullable', 'string', 'max:255'],
            'html_content' => ['required', 'string'],
            'json_design' => ['nullable', 'array'],
            'plain_text_content' => ['nullable', 'string'],
            'thumbnail' => ['nullable', 'string', 'max:255'],
            'tags' => ['nullable', 'array'],
            'variables' => ['nullable', 'array'],
            'status' => ['required', Rule::in(['draft', 'published', 'archived'])],
            'is_default' => ['nullable', 'boolean'],
            'is_public' => ['nullable', 'boolean'],
        ];
    }
}

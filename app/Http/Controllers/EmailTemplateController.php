<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEmailTemplateRequest;
use App\Http\Requests\UpdateEmailTemplateRequest;
use App\Models\EmailTemplate;
use App\Services\EmailTemplateService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Response;

class EmailTemplateController extends Controller
{
    /**
     * List all templates for the authenticated user's organization.
     */
    public function index(Request $request): Response
    {
        $templates = EmailTemplate::where('organization_id', $request->user()->organization_id)
            ->orderBy('updated_at', 'desc')
            ->get();
        return response()->json($templates);
    }

    /**
     * Store a new template.
     */
    public function store(StoreEmailTemplateRequest $request): Response
    {
        $data = $request->validated();
        $data['organization_id'] = $request->user()->organization_id;
        $data['created_by'] = $request->user()->id;
        $data['updated_by'] = $request->user()->id;
        $template = EmailTemplate::create($data);
        return response()->json($template, 201);
    }

    /**
     * Show a single template.
     */
    public function show(EmailTemplate $template): Response
    {
        $this->authorize('view', $template);
        return response()->json($template);
    }

    /**
     * Update an existing template.
     */
    public function update(UpdateEmailTemplateRequest $request, EmailTemplate $template): Response
    {
        $this->authorize('update', $template);
        $data = $request->validated();
        $data['updated_by'] = $request->user()->id;
        $template->update($data);
        return response()->json($template);
    }

    /**
     * Delete a template.
     */
    public function destroy(EmailTemplate $template): Response
    {
        $this->authorize('delete', $template);
        $template->delete();
        return response()->json(null, 204);
    }

    /**
     * Duplicate a template.
     */
    public function duplicate(EmailTemplate $template): Response
    {
        $this->authorize('duplicate', $template);
        $new = $template->replicate();
        $new->template_name .= ' (Copy)';
        $new->slug = $new->template_name . '-' . now()->timestamp;
        $new->created_by = Auth::id();
        $new->updated_by = Auth::id();
        $new->save();
        return response()->json($new, 201);
    }

    /**
     * Render template with supplied variables for preview.
     */
    public function render(Request $request, EmailTemplate $template): Response
    {
        $this->authorize('render', $template);
        $variables = $request->input('variables', []);
        $service = new EmailTemplateService();
        $rendered = $service->render($template, $variables);
        return response()->json(['html' => $rendered]);
    }

    /**
     * Send a test email using the rendered content.
     */
    public function testSend(Request $request, EmailTemplate $template): Response
    {
        $this->authorize('render', $template);
        $variables = $request->input('variables', []);
        $service = new EmailTemplateService();
        $rendered = $service->render($template, $variables);
        // Here you would dispatch a job to send the email. For brevity we return the content.
        return response()->json(['preview' => $rendered]);
    }
}

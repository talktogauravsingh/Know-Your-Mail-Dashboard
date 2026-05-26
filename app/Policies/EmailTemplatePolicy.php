<?php

namespace App\Policies;

use App\Models\EmailTemplate;
use App\Models\User;

class EmailTemplatePolicy
{
    /**
     * Determine whether the user can view any templates.
     */
    public function viewAny(User $user)
    {
        // Users can view templates belonging to their organization
        return true; // further checks are applied per resource
    }

    /**
     * Determine whether the user can view the template.
     */
    public function view(User $user, EmailTemplate $template)
    {
        return $user->organization_id === $template->organization_id;
    }

    /**
     * Determine whether the user can create templates.
     */
    public function create(User $user)
    {
        return true; // any authenticated user can create within their org
    }

    /**
     * Determine whether the user can update the template.
     */
    public function update(User $user, EmailTemplate $template)
    {
        return $user->id === $template->created_by || $user->hasRole('admin');
    }

    /**
     * Determine whether the user can delete the template.
     */
    public function delete(User $user, EmailTemplate $template)
    {
        return $user->id === $template->created_by || $user->hasRole('admin');
    }

    /**
     * Determine whether the user can duplicate the template.
     */
    public function duplicate(User $user, EmailTemplate $template)
    {
        return $this->view($user, $template);
    }

    /**
     * Determine whether the user can render/preview the template.
     */
    public function render(User $user, EmailTemplate $template)
    {
        return $this->view($user, $template);
    }
}

<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BulkMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $htmlBody;
    public string $mailSubject;

    public function __construct(string $subject, string $htmlBody)
    {
        $this->mailSubject = $subject;
        $this->htmlBody = $htmlBody;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->mailSubject
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'email.campaign'
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
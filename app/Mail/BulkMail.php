<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BulkMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $bannerLine; // renamed

    public function __construct(string $bannerLine)
    {
        $this->bannerLine = $bannerLine;
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Bulk Mail');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.bulk');
    }

    public function attachments(): array
    {
        return [];
    }
}
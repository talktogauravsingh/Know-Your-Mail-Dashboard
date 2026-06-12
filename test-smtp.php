<?php

require __DIR__.'/vendor/autoload.php';

use Symfony\Component\Mailer\Transport\Smtp\EsmtpTransport;
use Symfony\Component\Mailer\Mailer;
use Symfony\Component\Mime\Email;

try {
    echo "Connecting to SMTP server at 127.0.0.1:25...\n";
    $transport = new EsmtpTransport('127.0.0.1', 25);
    $transport->setUsername('promptbook-gs');
    $transport->setPassword('kym_sec_OJROchlUWoy42kjjlWEN0A6a');
    
    $mailer = new Mailer($transport);
    
    $email = (new Email())
        ->from('test@promptbook.co.in')
        ->to('talktoogaurav@gmail.com')
        ->subject('Testing Mailgun Relay via KnowYourMail')
        ->text('This email was routed through the local Haraka SMTP relay and sent out via Mailgun!')
        ->html('<p>This email was routed through the local <strong>Haraka SMTP relay</strong> and sent out via <strong>Mailgun</strong>!</p>');

    echo "Sending email to talktoogaurav@gmail.com...\n";
    $mailer->send($email);
    echo "Email sent successfully!\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

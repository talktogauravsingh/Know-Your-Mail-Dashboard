<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\SmtpConfiguration;
use Illuminate\Database\Seeder;

class OrganizationSeeder extends Seeder
{
    public function run(): void
    {
        $orgs = [
            [
                'name' => 'Test Organization',
                'smtp_configs' => [
                    ['provider' => 'AWS SES', 'from_name' => 'Marketing Team', 'from_address' => 'marketing@testorg.com']
                ]
            ],
            [
                'name' => 'E-commerce Corp',
                'smtp_configs' => [
                    ['provider' => 'SendGrid', 'from_name' => 'Shop Team', 'from_address' => 'shop@ecomcorp.com']
                ]
            ],
            [
                'name' => 'Newsletter Inc',
                'smtp_configs' => [
                    ['provider' => 'Mailgun', 'from_name' => 'Newsletter', 'from_address' => 'news@newsinc.com']
                ]
            ],
            [
                'name' => 'B2B Leads',
                'smtp_configs' => [
                    ['provider' => 'SMTP', 'from_name' => 'Sales Team', 'from_address' => 'leads@b2b.com']
                ]
            ]
        ];

        foreach ($orgs as $orgData) {
            $org = Organization::firstOrCreate(
                ['name' => $orgData['name']],
                ['name' => $orgData['name']]
            );

            foreach ($orgData['smtp_configs'] as $smtpData) {
                SmtpConfiguration::firstOrCreate(
                    [
                        'organization_id' => $org->id,
                        'provider' => $smtpData['provider'],
                        'from_address' => $smtpData['from_address']
                    ],
                    [
                        'organization_id' => $org->id,
                        'host' => match($smtpData['provider']) {
                            'AWS SES' => 'email-smtp.us-east-1.amazonaws.com',
                            'SendGrid' => 'smtp.sendgrid.net',
                            'Mailgun' => 'smtp.mailgun.org',
                            default => 'smtp.example.com'
                        },
                        'port' => 587,
                        'username' => 'testuser',
                        'password' => 'testpass123',
                        'from_name' => $smtpData['from_name'],
                        'from_address' => $smtpData['from_address'],
                        'is_global' => false,
                    ]
                );
            }
        }
    }
}


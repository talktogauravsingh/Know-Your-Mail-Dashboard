<?php

namespace App\Http\Controllers\Campaign;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class CampaignController extends Controller
{
    //
    public function getInsights($campaignId)
    {
        return DB::table('campaign_csv_insights')
            ->where('organization_id', $campaignId)
            ->get();
    }
}

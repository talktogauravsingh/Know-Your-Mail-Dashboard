<?php

// Related to authentication functionality
define("AUTH_SESSION_KEY", "authPermission");
define("AUTH_ROOT_ID", 1);
define("AUTH_STATUS_NOTALLOW", 0);
define("AUTH_STATUS_ALLOW", 1);
define("AUTH_ACTION_ALL", 1);
define("ACTIVE", 1);

// Sidebar / Page constants (useful for testing or checking page-level access)
define("AUTH_PAGE_OVERVIEW", 1);
define("AUTH_PAGE_BILLING", 2);
define("AUTH_PAGE_CAMPAIGNS", 3);
define("AUTH_PAGE_TEMPLATES", 4);
define("AUTH_PAGE_AUTOMATION", 5);
define("AUTH_PAGE_AUDIENCE", 6);
define("AUTH_PAGE_GLOBAL_IMPORT", 7);
define("AUTH_PAGE_SETTINGS", 8);
define("AUTH_PAGE_FOUNDER_CONSOLE", 9);

// Sidebar / Page Sub-tabs
define("AUTH_PAGE_SETTINGS_PROFILE", 10);
define("AUTH_PAGE_SETTINGS_TEAM", 11);
define("AUTH_PAGE_SETTINGS_ROLES_PERMISSIONS", 12);
define("AUTH_PAGE_SETTINGS_SMTP", 13);
define("AUTH_PAGE_SETTINGS_DOMAINS", 14);
define("AUTH_PAGE_SETTINGS_RELAY_KEYS", 15);
define("AUTH_PAGE_SETTINGS_SUPPRESSIONS", 16);
define("AUTH_PAGE_SETTINGS_ROOT_CONSOLE", 17);

// Action Constants
define("AUTH_ACTION_VIEW", 2);
define("AUTH_ACTION_CREATE", 3);
define("AUTH_ACTION_EDIT", 4);
define("AUTH_ACTION_DELETE", 5);

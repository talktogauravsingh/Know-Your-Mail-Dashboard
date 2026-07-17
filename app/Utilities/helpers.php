<?php

/*
** CHECK THE PAGE ACCESS FUNCTIONALITY
*/
if (!function_exists("authPageAccess")) {
    function authPageAccess($pageId, $action)
    {
        $src = session()->get(AUTH_SESSION_KEY);
        if (empty($src)) {
            $user = auth()->user();
            if ($user) {
                $src = $user->getAuthRolePageActionList();
                session()->put(AUTH_SESSION_KEY, $src);
            }
        }

        if (!empty($src)) {
            if (isset($src["isRoot"]) && $src["isRoot"] == 1) {
                return AUTH_STATUS_ALLOW;
            } else {
                if (isset($src["permissionList"]) && isset($src["permissionList"][$pageId]) && (isset($src["permissionList"][$pageId][AUTH_ACTION_ALL]) || isset($src["permissionList"][$pageId][$action]))) {
                    return AUTH_STATUS_ALLOW;
                }
            }
        }
        return AUTH_STATUS_NOTALLOW;
    }
}

if (!function_exists("hasPermission")) {
    function hasPermission(int $pageId, int $actionId): bool
    {
        $auth = session()->get(AUTH_SESSION_KEY);
        if (empty($auth)) {
            $user = auth()->user();
            if ($user) {
                $auth = $user->getAuthRolePageActionList();
                session()->put(AUTH_SESSION_KEY, $auth);
            }
        }

        if (empty($auth)) {
            return false;
        }

        if (!empty($auth['isRoot']) && $auth['isRoot'] == 1) {
            return true;
        }

        return isset($auth['permissionList'][$pageId][$actionId]) || isset($auth['permissionList'][$pageId][AUTH_ACTION_ALL]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\LicenseValidationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class LicenseController extends Controller
{
    private LicenseValidationService $licenseService;

    public function __construct(LicenseValidationService $licenseService)
    {
        $this->licenseService = $licenseService;
    }

    /**
     * Validate a license key.
     */
    public function validate(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'license_key' => 'required|string',
            'hardware_fingerprint' => 'required|string',
            'validation_type' => 'sometimes|string|in:startup,periodic,feature_access,manual',
            'system_info' => 'sometimes|array',
            'system_info.machine_name' => 'sometimes|string',
            'system_info.os_type' => 'sometimes|string',
            'system_info.os_version' => 'sometimes|string',
            'system_info.app_version' => 'sometimes|string',
            'system_info.cpu_id' => 'sometimes|string',
            'system_info.motherboard_id' => 'sometimes|string',
            'system_info.disk_serial' => 'sometimes|string',
            'system_info.mac_address' => 'sometimes|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'valid' => false,
                'status' => 'invalid_request',
                'message' => 'Invalid request parameters',
                'errors' => $validator->errors(),
            ], 400);
        }

        $result = $this->licenseService->validateLicense(
            $request->input('license_key'),
            $request->input('hardware_fingerprint'),
            $request->input('system_info', []),
            $request->input('validation_type', 'startup')
        );

        $statusCode = $result['valid'] ? 200 : 403;
        
        return response()->json($result, $statusCode);
    }

    /**
     * Get license information.
     */
    public function info(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'license_key' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'invalid_request',
                'message' => 'Invalid request parameters',
                'errors' => $validator->errors(),
            ], 400);
        }

        $info = $this->licenseService->getLicenseInfo($request->input('license_key'));

        if (!$info) {
            return response()->json([
                'status' => 'not_found',
                'message' => 'License key not found',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'license' => $info,
        ]);
    }

    /**
     * Activate a license key for first time use.
     */
    public function activate(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'license_key' => 'required|string',
            'hardware_fingerprint' => 'required|string',
            'system_info' => 'required|array',
            'system_info.machine_name' => 'required|string',
            'system_info.os_type' => 'required|string',
            'system_info.os_version' => 'required|string',
            'system_info.app_version' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'valid' => false,
                'status' => 'invalid_request',
                'message' => 'Invalid request parameters',
                'errors' => $validator->errors(),
            ], 400);
        }

        // Activation is essentially the same as validation for first-time use
        $result = $this->licenseService->validateLicense(
            $request->input('license_key'),
            $request->input('hardware_fingerprint'),
            $request->input('system_info'),
            'startup'
        );

        $statusCode = $result['valid'] ? 200 : 403;
        
        return response()->json($result, $statusCode);
    }

    /**
     * Deactivate an installation.
     */
    public function deactivate(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'license_key' => 'required|string',
            'hardware_fingerprint' => 'required|string',
            'reason' => 'sometimes|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'invalid_request',
                'message' => 'Invalid request parameters',
                'errors' => $validator->errors(),
            ], 400);
        }

        // Find the installation and deactivate it
        $license = \App\Models\LicenseKey::where('license_key', $request->input('license_key'))->first();
        
        if (!$license) {
            return response()->json([
                'status' => 'not_found',
                'message' => 'License key not found',
            ], 404);
        }

        $installation = $license->installations()
            ->where('hardware_fingerprint', $request->input('hardware_fingerprint'))
            ->first();

        if (!$installation) {
            return response()->json([
                'status' => 'not_found',
                'message' => 'Installation not found',
            ], 404);
        }

        $installation->deactivate($request->input('reason', 'User requested deactivation'));

        // Clear validation cache
        $this->licenseService->clearValidationCache(
            $request->input('license_key'),
            $request->input('hardware_fingerprint')
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Installation deactivated successfully',
        ]);
    }

    /**
     * Check server connectivity and API status.
     */
    public function ping(): JsonResponse
    {
        return response()->json([
            'status' => 'online',
            'timestamp' => now()->toISOString(),
            'version' => '1.0.0',
        ]);
    }

    /**
     * Record usage statistics.
     */
    public function recordUsage(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'license_key' => 'required|string',
            'hardware_fingerprint' => 'required|string',
            'event_type' => 'required|string|in:login,patient_created,user_created,feature_used',
            'event_data' => 'sometimes|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'invalid_request',
                'message' => 'Invalid request parameters',
                'errors' => $validator->errors(),
            ], 400);
        }

        // Find the installation
        $license = \App\Models\LicenseKey::where('license_key', $request->input('license_key'))->first();
        
        if (!$license) {
            return response()->json([
                'status' => 'not_found',
                'message' => 'License key not found',
            ], 404);
        }

        $installation = $license->installations()
            ->where('hardware_fingerprint', $request->input('hardware_fingerprint'))
            ->where('status', 'active')
            ->first();

        if (!$installation) {
            return response()->json([
                'status' => 'not_found',
                'message' => 'Active installation not found',
            ], 404);
        }

        // Record the usage event
        $eventType = $request->input('event_type');
        switch ($eventType) {
            case 'login':
                $installation->recordLogin();
                break;
            case 'patient_created':
                $installation->recordPatientCreation();
                break;
            case 'user_created':
                $installation->recordUserCreation();
                break;
            case 'feature_used':
                // Could be extended to track specific feature usage
                break;
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Usage recorded successfully',
        ]);
    }
}

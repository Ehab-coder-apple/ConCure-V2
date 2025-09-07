<?php

namespace App\Services;

use App\Models\LicenseKey;
use App\Models\LicenseInstallation;
use App\Models\LicenseValidationLog;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;

class LicenseValidationService
{
    private const CACHE_PREFIX = 'license_validation_';
    private const CACHE_DURATION = 300; // 5 minutes

    /**
     * Validate a license key for a specific installation.
     */
    public function validateLicense(
        string $licenseKey,
        string $hardwareFingerprint,
        array $systemInfo = [],
        string $validationType = 'startup'
    ): array {
        $startTime = microtime(true);
        
        try {
            // Check cache first for recent validations
            $cacheKey = $this->getCacheKey($licenseKey, $hardwareFingerprint);
            if ($validationType === 'periodic' && Cache::has($cacheKey)) {
                return Cache::get($cacheKey);
            }

            // Find license key
            $license = LicenseKey::where('license_key', $licenseKey)->first();
            
            if (!$license) {
                return $this->createFailureResponse(
                    null, null, $licenseKey, $validationType,
                    'invalid', 'License key not found',
                    $systemInfo, $startTime
                );
            }

            // Check license validity
            if (!$license->isValid()) {
                $reason = $license->isExpired() ? 'License has expired' : 'License is not active';
                $result = $license->isExpired() ? 'expired' : 'suspended';
                
                return $this->createFailureResponse(
                    $license->id, null, $licenseKey, $validationType,
                    $result, $reason, $systemInfo, $startTime
                );
            }

            // Find or create installation
            $installation = $this->findOrCreateInstallation($license, $hardwareFingerprint, $systemInfo);
            
            if (!$installation) {
                return $this->createFailureResponse(
                    $license->id, null, $licenseKey, $validationType,
                    'failed', 'Maximum installations exceeded',
                    $systemInfo, $startTime
                );
            }

            // Check installation status
            if (!$installation->isActive()) {
                return $this->createFailureResponse(
                    $license->id, $installation->id, $licenseKey, $validationType,
                    'suspended', 'Installation is blocked or inactive',
                    $systemInfo, $startTime
                );
            }

            // Update timestamps
            $license->updateLastValidation();
            $installation->updateLastSeen();

            // Create success response
            $response = $this->createSuccessResponse($license, $installation, $systemInfo, $startTime);
            
            // Cache the response
            Cache::put($cacheKey, $response, self::CACHE_DURATION);
            
            return $response;

        } catch (\Exception $e) {
            return $this->createFailureResponse(
                $license->id ?? null, null, $licenseKey, $validationType,
                'failed', 'Validation error: ' . $e->getMessage(),
                $systemInfo, $startTime
            );
        }
    }

    /**
     * Find or create an installation for the license.
     */
    private function findOrCreateInstallation(
        LicenseKey $license,
        string $hardwareFingerprint,
        array $systemInfo
    ): ?LicenseInstallation {
        // Try to find existing installation by hardware fingerprint
        $installation = $license->installations()
            ->where('hardware_fingerprint', $hardwareFingerprint)
            ->first();

        if ($installation) {
            // Update system info if provided
            if (!empty($systemInfo)) {
                $installation->update([
                    'system_info' => array_merge($installation->system_info ?? [], $systemInfo),
                    'app_version' => $systemInfo['app_version'] ?? $installation->app_version,
                    'os_version' => $systemInfo['os_version'] ?? $installation->os_version,
                ]);
            }
            return $installation;
        }

        // Check if license can accommodate more installations
        if (!$license->canAddInstallation()) {
            return null;
        }

        // Create new installation
        return LicenseInstallation::create([
            'license_key_id' => $license->id,
            'installation_id' => LicenseInstallation::generateInstallationId(),
            'hardware_fingerprint' => $hardwareFingerprint,
            'machine_name' => $systemInfo['machine_name'] ?? null,
            'ip_address' => request()->ip(),
            'os_type' => $systemInfo['os_type'] ?? null,
            'os_version' => $systemInfo['os_version'] ?? null,
            'app_version' => $systemInfo['app_version'] ?? null,
            'system_info' => $systemInfo,
            'status' => 'active',
            'first_activated_at' => now(),
            'last_seen_at' => now(),
        ]);
    }

    /**
     * Create a success response.
     */
    private function createSuccessResponse(
        LicenseKey $license,
        LicenseInstallation $installation,
        array $systemInfo,
        float $startTime
    ): array {
        $responseTime = (int)((microtime(true) - $startTime) * 1000);
        
        $response = [
            'valid' => true,
            'status' => 'success',
            'license' => [
                'type' => $license->license_type,
                'expires_at' => $license->expires_at?->toISOString(),
                'is_trial' => $license->is_trial,
                'trial_days_remaining' => $license->getRemainingTrialDays(),
                'features' => $license->features ?? [],
                'max_users' => $license->max_users,
                'max_patients' => $license->max_patients,
            ],
            'installation' => [
                'id' => $installation->installation_id,
                'first_activated_at' => $installation->first_activated_at->toISOString(),
            ],
            'customer' => [
                'name' => $license->customer->company_name,
                'code' => $license->customer->customer_code,
            ],
        ];

        // Log successful validation
        LicenseValidationLog::logValidation(
            $license->id,
            $installation->id,
            $license->license_key,
            'startup',
            'success',
            null,
            $systemInfo,
            $response,
            $responseTime,
            request()->ip(),
            request()->userAgent(),
            $systemInfo['app_version'] ?? null
        );

        return $response;
    }

    /**
     * Create a failure response.
     */
    private function createFailureResponse(
        ?int $licenseKeyId,
        ?int $installationId,
        string $licenseKeyAttempted,
        string $validationType,
        string $result,
        string $reason,
        array $systemInfo,
        float $startTime
    ): array {
        $responseTime = (int)((microtime(true) - $startTime) * 1000);
        
        $response = [
            'valid' => false,
            'status' => $result,
            'message' => $reason,
        ];

        // Log failed validation
        LicenseValidationLog::logValidation(
            $licenseKeyId,
            $installationId,
            $licenseKeyAttempted,
            $validationType,
            $result,
            $reason,
            $systemInfo,
            $response,
            $responseTime,
            request()->ip(),
            request()->userAgent(),
            $systemInfo['app_version'] ?? null
        );

        return $response;
    }

    /**
     * Get cache key for license validation.
     */
    private function getCacheKey(string $licenseKey, string $hardwareFingerprint): string
    {
        return self::CACHE_PREFIX . hash('sha256', $licenseKey . $hardwareFingerprint);
    }

    /**
     * Clear validation cache for a license.
     */
    public function clearValidationCache(string $licenseKey, string $hardwareFingerprint): void
    {
        $cacheKey = $this->getCacheKey($licenseKey, $hardwareFingerprint);
        Cache::forget($cacheKey);
    }

    /**
     * Get license information without full validation.
     */
    public function getLicenseInfo(string $licenseKey): ?array
    {
        $license = LicenseKey::with('customer')->where('license_key', $licenseKey)->first();
        
        if (!$license) {
            return null;
        }

        return [
            'type' => $license->license_type,
            'status' => $license->status,
            'expires_at' => $license->expires_at?->toISOString(),
            'is_trial' => $license->is_trial,
            'trial_days_remaining' => $license->getRemainingTrialDays(),
            'features' => $license->features ?? [],
            'max_installations' => $license->max_installations,
            'active_installations' => $license->active_installations_count,
            'customer' => [
                'name' => $license->customer->company_name,
                'code' => $license->customer->customer_code,
            ],
        ];
    }
}

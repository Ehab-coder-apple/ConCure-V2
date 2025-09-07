<?php

namespace App\Services;

use App\Models\LicenseCustomer;
use App\Models\LicenseKey;
use Illuminate\Support\Facades\Crypt;
use Carbon\Carbon;

class LicenseKeyGeneratorService
{
    /**
     * Generate a new license key for a customer.
     */
    public function generateLicense(
        int $customerId,
        string $licenseType = 'standard',
        ?Carbon $expiresAt = null,
        int $maxInstallations = 1,
        int $maxUsers = 10,
        ?int $maxPatients = null,
        array $features = [],
        bool $isTrial = false,
        ?int $trialDays = null
    ): LicenseKey {
        $customer = LicenseCustomer::findOrFail($customerId);
        
        // Generate unique license key
        $licenseKey = $this->generateUniqueKey($customer->customer_code, $licenseType);
        
        // Set default features based on license type
        if (empty($features)) {
            $features = $this->getDefaultFeatures($licenseType);
        }
        
        // Create license record
        return LicenseKey::create([
            'customer_id' => $customerId,
            'license_key' => $licenseKey,
            'license_type' => $licenseType,
            'product_version' => '1.0.0',
            'issued_at' => now(),
            'expires_at' => $expiresAt,
            'max_installations' => $maxInstallations,
            'max_users' => $maxUsers,
            'max_patients' => $maxPatients,
            'features' => $features,
            'status' => 'active',
            'is_trial' => $isTrial,
            'trial_days' => $trialDays,
            'max_hardware_changes' => 3,
            'hardware_changes_count' => 0,
        ]);
    }

    /**
     * Generate a trial license.
     */
    public function generateTrialLicense(
        int $customerId,
        int $trialDays = 30,
        int $maxInstallations = 1,
        int $maxUsers = 5,
        ?int $maxPatients = 50
    ): LicenseKey {
        $expiresAt = now()->addDays($trialDays);
        
        return $this->generateLicense(
            customerId: $customerId,
            licenseType: 'trial',
            expiresAt: $expiresAt,
            maxInstallations: $maxInstallations,
            maxUsers: $maxUsers,
            maxPatients: $maxPatients,
            features: $this->getDefaultFeatures('trial'),
            isTrial: true,
            trialDays: $trialDays
        );
    }

    /**
     * Generate a unique license key.
     */
    private function generateUniqueKey(string $customerCode, string $licenseType): string
    {
        do {
            $key = $this->createLicenseKey($customerCode, $licenseType);
        } while (LicenseKey::where('license_key', $key)->exists());
        
        return $key;
    }

    /**
     * Create the actual license key string.
     */
    private function createLicenseKey(string $customerCode, string $licenseType): string
    {
        // License type prefix
        $typePrefix = match($licenseType) {
            'trial' => 'TR',
            'standard' => 'ST',
            'premium' => 'PR',
            'enterprise' => 'EN',
            default => 'ST'
        };
        
        // Customer identifier (last 4 chars of customer code)
        $customerPart = strtoupper(substr($customerCode, -4));
        
        // Generate random parts
        $timestamp = base_convert(time(), 10, 36);
        $random1 = strtoupper(substr(md5(uniqid()), 0, 4));
        $random2 = strtoupper(substr(md5(uniqid() . microtime()), 0, 4));
        $random3 = strtoupper(substr(md5(uniqid() . rand()), 0, 4));
        
        // Create checksum
        $dataForChecksum = $typePrefix . $customerPart . $random1 . $random2;
        $checksum = strtoupper(substr(md5($dataForChecksum), 0, 2));
        
        // Format: XX-XXXX-XXXX-XXXX-XXXX-XX
        return sprintf(
            '%s-%s-%s-%s-%s-%s',
            $typePrefix,
            $customerPart,
            $random1,
            $random2,
            $random3,
            $checksum
        );
    }

    /**
     * Get default features for a license type.
     */
    private function getDefaultFeatures(string $licenseType): array
    {
        return match($licenseType) {
            'trial' => [
                'patient_management',
                'basic_checkups',
                'basic_prescriptions',
                'basic_reports',
            ],
            'standard' => [
                'patient_management',
                'checkups',
                'prescriptions',
                'appointments',
                'basic_reports',
                'medicine_management',
                'lab_requests',
            ],
            'premium' => [
                'patient_management',
                'checkups',
                'prescriptions',
                'appointments',
                'reports',
                'medicine_management',
                'lab_requests',
                'nutrition_plans',
                'finance_management',
                'user_management',
                'whatsapp_integration',
            ],
            'enterprise' => [
                'patient_management',
                'checkups',
                'prescriptions',
                'appointments',
                'advanced_reports',
                'medicine_management',
                'lab_requests',
                'nutrition_plans',
                'finance_management',
                'user_management',
                'whatsapp_integration',
                'api_access',
                'custom_forms',
                'advanced_analytics',
                'multi_clinic',
            ],
            default => []
        };
    }

    /**
     * Validate license key format.
     */
    public function validateKeyFormat(string $licenseKey): bool
    {
        // Check basic format: XX-XXXX-XXXX-XXXX-XXXX-XX
        if (!preg_match('/^[A-Z]{2}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{2}$/', $licenseKey)) {
            return false;
        }
        
        // Validate checksum
        $parts = explode('-', $licenseKey);
        if (count($parts) !== 6) {
            return false;
        }
        
        $dataForChecksum = $parts[0] . $parts[1] . $parts[2] . $parts[3];
        $expectedChecksum = strtoupper(substr(md5($dataForChecksum), 0, 2));
        
        return $parts[5] === $expectedChecksum;
    }

    /**
     * Extract information from license key.
     */
    public function extractKeyInfo(string $licenseKey): ?array
    {
        if (!$this->validateKeyFormat($licenseKey)) {
            return null;
        }
        
        $parts = explode('-', $licenseKey);
        
        $licenseType = match($parts[0]) {
            'TR' => 'trial',
            'ST' => 'standard',
            'PR' => 'premium',
            'EN' => 'enterprise',
            default => 'unknown'
        };
        
        return [
            'type_prefix' => $parts[0],
            'license_type' => $licenseType,
            'customer_part' => $parts[1],
            'checksum' => $parts[5],
            'is_valid_format' => true,
        ];
    }

    /**
     * Extend license expiration.
     */
    public function extendLicense(int $licenseId, int $days): bool
    {
        $license = LicenseKey::find($licenseId);
        
        if (!$license) {
            return false;
        }
        
        $currentExpiry = $license->expires_at ?? now();
        $newExpiry = $currentExpiry->addDays($days);
        
        $license->update(['expires_at' => $newExpiry]);
        
        return true;
    }

    /**
     * Upgrade license type.
     */
    public function upgradeLicense(int $licenseId, string $newType): bool
    {
        $license = LicenseKey::find($licenseId);
        
        if (!$license) {
            return false;
        }
        
        $newFeatures = $this->getDefaultFeatures($newType);
        $newLimits = $this->getTypeLimits($newType);
        
        $license->update([
            'license_type' => $newType,
            'features' => $newFeatures,
            'max_users' => $newLimits['max_users'],
            'max_patients' => $newLimits['max_patients'],
            'max_installations' => $newLimits['max_installations'],
        ]);
        
        return true;
    }

    /**
     * Get limits for license type.
     */
    private function getTypeLimits(string $licenseType): array
    {
        return match($licenseType) {
            'trial' => [
                'max_users' => 2,
                'max_patients' => 50,
                'max_installations' => 1,
            ],
            'standard' => [
                'max_users' => 10,
                'max_patients' => 1000,
                'max_installations' => 1,
            ],
            'premium' => [
                'max_users' => 25,
                'max_patients' => 5000,
                'max_installations' => 2,
            ],
            'enterprise' => [
                'max_users' => 100,
                'max_patients' => null, // unlimited
                'max_installations' => 5,
            ],
            default => [
                'max_users' => 10,
                'max_patients' => 1000,
                'max_installations' => 1,
            ]
        };
    }
}

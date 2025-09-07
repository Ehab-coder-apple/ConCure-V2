<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Crypt;
use Carbon\Carbon;

class LicenseKey extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'license_key',
        'license_type',
        'product_version',
        'issued_at',
        'expires_at',
        'activated_at',
        'last_validated_at',
        'max_installations',
        'max_users',
        'max_patients',
        'features',
        'status',
        'is_trial',
        'trial_days',
        'hardware_fingerprint',
        'max_hardware_changes',
        'hardware_changes_count',
        'metadata',
        'notes',
    ];

    protected $casts = [
        'issued_at' => 'datetime',
        'expires_at' => 'datetime',
        'activated_at' => 'datetime',
        'last_validated_at' => 'datetime',
        'features' => 'array',
        'is_trial' => 'boolean',
        'metadata' => 'array',
    ];

    /**
     * License types
     */
    const TYPES = [
        'trial' => 'Trial',
        'standard' => 'Standard',
        'premium' => 'Premium',
        'enterprise' => 'Enterprise',
    ];

    /**
     * License statuses
     */
    const STATUSES = [
        'active' => 'Active',
        'suspended' => 'Suspended',
        'expired' => 'Expired',
        'revoked' => 'Revoked',
    ];

    /**
     * Get the customer that owns this license.
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(LicenseCustomer::class, 'customer_id');
    }

    /**
     * Get the installations for this license.
     */
    public function installations(): HasMany
    {
        return $this->hasMany(LicenseInstallation::class, 'license_key_id');
    }

    /**
     * Get the validation logs for this license.
     */
    public function validationLogs(): HasMany
    {
        return $this->hasMany(LicenseValidationLog::class, 'license_key_id');
    }

    /**
     * Generate a new license key.
     */
    public static function generateLicenseKey(string $customerCode, string $licenseType = 'standard'): string
    {
        $prefix = strtoupper(substr($licenseType, 0, 2));
        $customerPart = strtoupper(substr($customerCode, -4));
        $randomPart = strtoupper(substr(md5(uniqid() . time()), 0, 16));
        
        // Format: XX-XXXX-XXXX-XXXX-XXXX
        $key = $prefix . '-' . $customerPart . '-' . 
               substr($randomPart, 0, 4) . '-' . 
               substr($randomPart, 4, 4) . '-' . 
               substr($randomPart, 8, 4);
        
        return $key;
    }

    /**
     * Check if license is currently valid.
     */
    public function isValid(): bool
    {
        if ($this->status !== 'active') {
            return false;
        }

        if ($this->expires_at && $this->expires_at->isPast()) {
            return false;
        }

        return true;
    }

    /**
     * Check if license is expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    /**
     * Check if license is a trial.
     */
    public function isTrial(): bool
    {
        return $this->is_trial;
    }

    /**
     * Get remaining trial days.
     */
    public function getRemainingTrialDays(): ?int
    {
        if (!$this->is_trial || !$this->activated_at) {
            return null;
        }

        $trialEnd = $this->activated_at->addDays($this->trial_days);
        $remaining = now()->diffInDays($trialEnd, false);
        
        return max(0, $remaining);
    }

    /**
     * Check if license can accommodate more installations.
     */
    public function canAddInstallation(): bool
    {
        $activeInstallations = $this->installations()->where('status', 'active')->count();
        return $activeInstallations < $this->max_installations;
    }

    /**
     * Get active installations count.
     */
    public function getActiveInstallationsCountAttribute(): int
    {
        return $this->installations()->where('status', 'active')->count();
    }

    /**
     * Check if feature is enabled for this license.
     */
    public function hasFeature(string $feature): bool
    {
        if (!$this->features) {
            return false;
        }

        return in_array($feature, $this->features);
    }

    /**
     * Update last validation timestamp.
     */
    public function updateLastValidation(): void
    {
        $this->update(['last_validated_at' => now()]);
    }
}

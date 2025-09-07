<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LicenseValidationLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'license_key_id',
        'installation_id',
        'license_key_attempted',
        'validation_type',
        'result',
        'failure_reason',
        'ip_address',
        'user_agent',
        'app_version',
        'request_data',
        'response_data',
        'response_time_ms',
        'validated_at',
    ];

    protected $casts = [
        'validated_at' => 'datetime',
        'request_data' => 'array',
        'response_data' => 'array',
    ];

    /**
     * Validation types
     */
    const TYPES = [
        'startup' => 'Application Startup',
        'periodic' => 'Periodic Check',
        'feature_access' => 'Feature Access',
        'manual' => 'Manual Validation',
    ];

    /**
     * Validation results
     */
    const RESULTS = [
        'success' => 'Success',
        'failed' => 'Failed',
        'expired' => 'Expired',
        'suspended' => 'Suspended',
        'invalid' => 'Invalid',
    ];

    /**
     * Get the license key that owns this log.
     */
    public function licenseKey(): BelongsTo
    {
        return $this->belongsTo(LicenseKey::class, 'license_key_id');
    }

    /**
     * Get the installation that owns this log.
     */
    public function installation(): BelongsTo
    {
        return $this->belongsTo(LicenseInstallation::class, 'installation_id');
    }

    /**
     * Create a validation log entry.
     */
    public static function logValidation(
        ?int $licenseKeyId,
        ?int $installationId,
        string $licenseKeyAttempted,
        string $validationType,
        string $result,
        ?string $failureReason = null,
        ?array $requestData = null,
        ?array $responseData = null,
        ?int $responseTimeMs = null,
        ?string $ipAddress = null,
        ?string $userAgent = null,
        ?string $appVersion = null
    ): self {
        return self::create([
            'license_key_id' => $licenseKeyId,
            'installation_id' => $installationId,
            'license_key_attempted' => $licenseKeyAttempted,
            'validation_type' => $validationType,
            'result' => $result,
            'failure_reason' => $failureReason,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
            'app_version' => $appVersion,
            'request_data' => $requestData,
            'response_data' => $responseData,
            'response_time_ms' => $responseTimeMs,
            'validated_at' => now(),
        ]);
    }

    /**
     * Check if validation was successful.
     */
    public function wasSuccessful(): bool
    {
        return $this->result === 'success';
    }

    /**
     * Get human-readable validation type.
     */
    public function getValidationTypeNameAttribute(): string
    {
        return self::TYPES[$this->validation_type] ?? $this->validation_type;
    }

    /**
     * Get human-readable result.
     */
    public function getResultNameAttribute(): string
    {
        return self::RESULTS[$this->result] ?? $this->result;
    }

    /**
     * Scope to filter by result.
     */
    public function scopeByResult($query, string $result)
    {
        return $query->where('result', $result);
    }

    /**
     * Scope to filter by validation type.
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('validation_type', $type);
    }

    /**
     * Scope to filter by date range.
     */
    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('validated_at', [$startDate, $endDate]);
    }

    /**
     * Scope to get recent validations.
     */
    public function scopeRecent($query, int $days = 7)
    {
        return $query->where('validated_at', '>=', now()->subDays($days));
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LicenseInstallation extends Model
{
    use HasFactory;

    protected $fillable = [
        'license_key_id',
        'installation_id',
        'machine_name',
        'hardware_fingerprint',
        'ip_address',
        'os_type',
        'os_version',
        'app_version',
        'system_info',
        'status',
        'first_activated_at',
        'last_seen_at',
        'deactivated_at',
        'total_logins',
        'total_patients_created',
        'total_users_created',
        'last_login_at',
        'metadata',
    ];

    protected $casts = [
        'first_activated_at' => 'datetime',
        'last_seen_at' => 'datetime',
        'deactivated_at' => 'datetime',
        'last_login_at' => 'datetime',
        'system_info' => 'array',
        'metadata' => 'array',
    ];

    /**
     * Installation statuses
     */
    const STATUSES = [
        'active' => 'Active',
        'inactive' => 'Inactive',
        'blocked' => 'Blocked',
    ];

    /**
     * Get the license key that owns this installation.
     */
    public function licenseKey(): BelongsTo
    {
        return $this->belongsTo(LicenseKey::class, 'license_key_id');
    }

    /**
     * Get the validation logs for this installation.
     */
    public function validationLogs(): HasMany
    {
        return $this->hasMany(LicenseValidationLog::class, 'installation_id');
    }

    /**
     * Generate a unique installation ID.
     */
    public static function generateInstallationId(): string
    {
        do {
            $id = 'INST-' . strtoupper(substr(md5(uniqid() . time()), 0, 12));
        } while (self::where('installation_id', $id)->exists());

        return $id;
    }

    /**
     * Generate hardware fingerprint from system information.
     */
    public static function generateHardwareFingerprint(array $systemInfo): string
    {
        // Create a unique fingerprint based on hardware characteristics
        $components = [
            $systemInfo['cpu_id'] ?? '',
            $systemInfo['motherboard_id'] ?? '',
            $systemInfo['disk_serial'] ?? '',
            $systemInfo['mac_address'] ?? '',
            $systemInfo['os_install_date'] ?? '',
        ];

        $fingerprint = hash('sha256', implode('|', $components));
        return strtoupper(substr($fingerprint, 0, 32));
    }

    /**
     * Check if installation is active.
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Update last seen timestamp.
     */
    public function updateLastSeen(): void
    {
        $this->update(['last_seen_at' => now()]);
    }

    /**
     * Record a login event.
     */
    public function recordLogin(): void
    {
        $this->increment('total_logins');
        $this->update(['last_login_at' => now()]);
    }

    /**
     * Record patient creation.
     */
    public function recordPatientCreation(): void
    {
        $this->increment('total_patients_created');
    }

    /**
     * Record user creation.
     */
    public function recordUserCreation(): void
    {
        $this->increment('total_users_created');
    }

    /**
     * Check if hardware fingerprint matches.
     */
    public function matchesHardwareFingerprint(string $fingerprint): bool
    {
        return $this->hardware_fingerprint === $fingerprint;
    }

    /**
     * Deactivate this installation.
     */
    public function deactivate(string $reason = null): void
    {
        $this->update([
            'status' => 'inactive',
            'deactivated_at' => now(),
            'metadata' => array_merge($this->metadata ?? [], [
                'deactivation_reason' => $reason,
                'deactivated_by' => 'system',
            ]),
        ]);
    }

    /**
     * Get days since last seen.
     */
    public function getDaysSinceLastSeenAttribute(): ?int
    {
        if (!$this->last_seen_at) {
            return null;
        }

        return $this->last_seen_at->diffInDays(now());
    }

    /**
     * Check if installation is stale (not seen for a while).
     */
    public function isStale(int $days = 30): bool
    {
        if (!$this->last_seen_at) {
            return true;
        }

        return $this->last_seen_at->diffInDays(now()) > $days;
    }
}

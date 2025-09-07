<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LicenseCustomer extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_code',
        'company_name',
        'contact_name',
        'email',
        'phone',
        'address',
        'country',
        'timezone',
        'is_active',
        'activated_at',
        'deactivated_at',
        'billing_email',
        'billing_address',
        'tax_id',
        'metadata',
        'notes',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'activated_at' => 'datetime',
        'deactivated_at' => 'datetime',
        'metadata' => 'array',
    ];

    /**
     * Get the license keys for this customer.
     */
    public function licenseKeys(): HasMany
    {
        return $this->hasMany(LicenseKey::class, 'customer_id');
    }

    /**
     * Get active license keys for this customer.
     */
    public function activeLicenseKeys(): HasMany
    {
        return $this->licenseKeys()->where('status', 'active');
    }

    /**
     * Generate a unique customer code.
     */
    public static function generateCustomerCode(): string
    {
        do {
            $code = 'CUST-' . strtoupper(substr(md5(uniqid()), 0, 8));
        } while (self::where('customer_code', $code)->exists());

        return $code;
    }

    /**
     * Check if customer is active and can use licenses.
     */
    public function isActiveCustomer(): bool
    {
        return $this->is_active && $this->activated_at !== null;
    }

    /**
     * Get total number of installations across all licenses.
     */
    public function getTotalInstallationsAttribute(): int
    {
        return $this->licenseKeys()
            ->with('installations')
            ->get()
            ->sum(function ($license) {
                return $license->installations->count();
            });
    }

    /**
     * Get total number of active installations.
     */
    public function getActiveInstallationsAttribute(): int
    {
        return $this->licenseKeys()
            ->with(['installations' => function ($query) {
                $query->where('status', 'active');
            }])
            ->get()
            ->sum(function ($license) {
                return $license->installations->count();
            });
    }
}

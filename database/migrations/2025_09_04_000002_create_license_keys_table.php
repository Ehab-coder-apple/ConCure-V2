<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('license_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('license_customers')->onDelete('cascade');
            
            // License key information
            $table->string('license_key', 255)->unique(); // The actual license key
            $table->string('license_type')->default('standard'); // trial, standard, premium, enterprise
            $table->string('product_version')->default('1.0.0');
            
            // License validity
            $table->timestamp('issued_at');
            $table->timestamp('expires_at')->nullable(); // null = lifetime license
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('last_validated_at')->nullable();
            
            // License restrictions
            $table->integer('max_installations')->default(1); // How many installations allowed
            $table->integer('max_users')->default(10); // Max users per installation
            $table->integer('max_patients')->nullable(); // Max patients (null = unlimited)
            $table->json('features')->nullable(); // Enabled features array
            
            // License status
            $table->enum('status', ['active', 'suspended', 'expired', 'revoked'])->default('active');
            $table->boolean('is_trial')->default(false);
            $table->integer('trial_days')->nullable(); // Trial period in days
            
            // Hardware binding
            $table->string('hardware_fingerprint')->nullable(); // For hardware locking
            $table->integer('max_hardware_changes')->default(3); // Allow hardware changes
            $table->integer('hardware_changes_count')->default(0);
            
            // Metadata
            $table->json('metadata')->nullable(); // Additional license data
            $table->text('notes')->nullable(); // Internal notes
            
            $table->timestamps();
            
            // Indexes
            $table->index(['status', 'expires_at']);
            $table->index(['customer_id', 'status']);
            $table->index('license_type');
            $table->index('hardware_fingerprint');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('license_keys');
    }
};

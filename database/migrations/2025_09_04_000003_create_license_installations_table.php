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
        Schema::create('license_installations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('license_key_id')->constrained('license_keys')->onDelete('cascade');
            
            // Installation identification
            $table->string('installation_id')->unique(); // Unique installation identifier
            $table->string('machine_name')->nullable();
            $table->string('hardware_fingerprint'); // Hardware signature
            $table->string('ip_address')->nullable();
            
            // System information
            $table->string('os_type')->nullable(); // windows, macos, linux
            $table->string('os_version')->nullable();
            $table->string('app_version')->nullable();
            $table->json('system_info')->nullable(); // Additional system details
            
            // Installation status
            $table->enum('status', ['active', 'inactive', 'blocked'])->default('active');
            $table->timestamp('first_activated_at');
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('deactivated_at')->nullable();
            
            // Usage tracking
            $table->integer('total_logins')->default(0);
            $table->integer('total_patients_created')->default(0);
            $table->integer('total_users_created')->default(0);
            $table->timestamp('last_login_at')->nullable();
            
            // Metadata
            $table->json('metadata')->nullable(); // Additional installation data
            
            $table->timestamps();
            
            // Indexes
            $table->index(['license_key_id', 'status']);
            $table->index('hardware_fingerprint');
            $table->index(['status', 'last_seen_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('license_installations');
    }
};

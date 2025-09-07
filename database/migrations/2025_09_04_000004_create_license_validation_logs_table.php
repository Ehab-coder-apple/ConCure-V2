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
        Schema::create('license_validation_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('license_key_id')->nullable()->constrained('license_keys')->onDelete('set null');
            $table->foreignId('installation_id')->nullable()->constrained('license_installations')->onDelete('set null');
            
            // Validation details
            $table->string('license_key_attempted'); // The key that was attempted
            $table->string('validation_type'); // startup, periodic, feature_access
            $table->enum('result', ['success', 'failed', 'expired', 'suspended', 'invalid']);
            $table->text('failure_reason')->nullable();
            
            // Request information
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->string('app_version')->nullable();
            $table->json('request_data')->nullable(); // Additional request details
            
            // Response information
            $table->json('response_data')->nullable(); // What was returned
            $table->integer('response_time_ms')->nullable(); // Response time in milliseconds
            
            $table->timestamp('validated_at');
            $table->timestamps();
            
            // Indexes
            $table->index(['license_key_id', 'validated_at']);
            $table->index(['result', 'validated_at']);
            $table->index('validation_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('license_validation_logs');
    }
};

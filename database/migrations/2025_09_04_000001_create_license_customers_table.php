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
        Schema::create('license_customers', function (Blueprint $table) {
            $table->id();
            $table->string('customer_code')->unique(); // Unique customer identifier
            $table->string('company_name');
            $table->string('contact_name');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->string('country')->nullable();
            $table->string('timezone')->default('UTC');
            
            // Customer status
            $table->boolean('is_active')->default(true);
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('deactivated_at')->nullable();
            
            // Billing information
            $table->string('billing_email')->nullable();
            $table->text('billing_address')->nullable();
            $table->string('tax_id')->nullable();
            
            // Metadata
            $table->json('metadata')->nullable(); // Additional customer data
            $table->text('notes')->nullable(); // Internal notes
            
            $table->timestamps();
            
            // Indexes
            $table->index(['is_active', 'activated_at']);
            $table->index('email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('license_customers');
    }
};

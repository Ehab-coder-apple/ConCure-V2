<?php

require_once 'vendor/autoload.php';

use App\Models\LicenseCustomer;
use App\Models\LicenseKey;
use App\Services\LicenseKeyGeneratorService;
use Illuminate\Support\Facades\DB;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔑 ConCure License Generator\n";
echo "============================\n\n";

try {
    // Create a test customer
    echo "Creating test customer...\n";
    
    $customer = LicenseCustomer::create([
        'customer_code' => LicenseCustomer::generateCustomerCode(),
        'company_name' => 'Demo Clinic',
        'contact_name' => 'Dr. John Smith',
        'email' => 'demo@clinic.com',
        'phone' => '+1-555-0123',
        'address' => '123 Medical Center Dr, Healthcare City, HC 12345',
        'country' => 'United States',
        'is_active' => true,
        'activated_at' => now(),
    ]);
    
    echo "✅ Customer created: {$customer->company_name} ({$customer->customer_code})\n\n";
    
    // Create license key generator service
    $licenseGenerator = new LicenseKeyGeneratorService();
    
    // Generate different types of licenses
    $licenseTypes = [
        'trial' => [
            'name' => 'Trial License (30 days)',
            'type' => 'trial',
            'trial' => true,
            'days' => 30,
            'max_users' => 2,
            'max_patients' => 50,
        ],
        'standard' => [
            'name' => 'Standard License',
            'type' => 'standard',
            'trial' => false,
            'days' => null,
            'max_users' => 10,
            'max_patients' => 1000,
        ],
        'premium' => [
            'name' => 'Premium License',
            'type' => 'premium',
            'trial' => false,
            'days' => null,
            'max_users' => 25,
            'max_patients' => 5000,
        ],
    ];
    
    echo "Generating license keys...\n";
    echo "-------------------------\n";
    
    foreach ($licenseTypes as $key => $config) {
        echo "\n📄 {$config['name']}:\n";
        
        if ($config['trial']) {
            $license = $licenseGenerator->generateTrialLicense(
                $customer->id,
                $config['days'],
                1, // max installations
                $config['max_users'],
                $config['max_patients']
            );
        } else {
            $license = $licenseGenerator->generateLicense(
                $customer->id,
                $config['type'],
                null, // no expiration
                1, // max installations
                $config['max_users'],
                $config['max_patients']
            );
        }
        
        echo "   License Key: {$license->license_key}\n";
        echo "   Type: " . ucfirst($license->license_type) . "\n";
        echo "   Max Users: {$license->max_users}\n";
        echo "   Max Patients: " . ($license->max_patients ?: 'Unlimited') . "\n";
        
        if ($license->is_trial) {
            echo "   Trial Days: {$license->trial_days}\n";
            echo "   Expires: {$license->expires_at->format('Y-m-d H:i:s')}\n";
        } else {
            echo "   Expires: Never\n";
        }
        
        echo "   Features: " . implode(', ', $license->features) . "\n";
    }
    
    echo "\n\n🎉 Test licenses created successfully!\n";
    echo "\nYou can now use these license keys to test the desktop application:\n\n";
    
    // Display all generated licenses for easy copying
    $allLicenses = LicenseKey::where('customer_id', $customer->id)->get();
    
    foreach ($allLicenses as $license) {
        echo "🔑 {$license->license_key} ({$license->license_type})\n";
    }
    
    echo "\n📋 Customer Information:\n";
    echo "   Company: {$customer->company_name}\n";
    echo "   Contact: {$customer->contact_name}\n";
    echo "   Email: {$customer->email}\n";
    echo "   Customer Code: {$customer->customer_code}\n";
    
    echo "\n💡 Usage Instructions:\n";
    echo "1. Start the ConCure desktop application\n";
    echo "2. When prompted for a license key, use one of the keys above\n";
    echo "3. The application will validate the license and activate\n";
    echo "4. Check the license information in the application menu\n";
    
    echo "\n🔧 API Testing:\n";
    echo "You can also test the license API directly:\n";
    echo "POST http://127.0.0.1:8000/api/license/validate\n";
    echo "{\n";
    echo "  \"license_key\": \"{$allLicenses->first()->license_key}\",\n";
    echo "  \"hardware_fingerprint\": \"TEST-HARDWARE-FINGERPRINT-12345678\",\n";
    echo "  \"system_info\": {\n";
    echo "    \"machine_name\": \"Test-Machine\",\n";
    echo "    \"os_type\": \"darwin\",\n";
    echo "    \"os_version\": \"14.0\",\n";
    echo "    \"app_version\": \"1.0.0\"\n";
    echo "  }\n";
    echo "}\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}

echo "\n✨ Done!\n";

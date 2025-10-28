// Verify Environment Variables Configuration
// Run with: node verify-env.js

console.log('🔍 Verifying Environment Variables...\n');

const requiredVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

let hasErrors = false;

requiredVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: Found`);
  } else {
    console.log(`❌ ${varName}: MISSING`);
    hasErrors = true;
  }
});

console.log('\n---\n');

if (hasErrors) {
  console.log('❌ Error: Missing required environment variables!');
  console.log('📝 Action Required:');
  console.log('   1. Copy .env.example to .env');
  console.log('   2. Fill in your Supabase credentials');
  console.log('   3. Restart your dev server');
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set!');
  console.log('🚀 Ready to run the application');
  process.exit(0);
}

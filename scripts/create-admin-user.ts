import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://odeqbnntvogchzipniig.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kZXFibm50dm9nY2h6aXBuaWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5Mjc5OTgsImV4cCI6MjA3MjUwMzk5OH0.phWW0hNm-ujEEsngjhf88us4suJv9boQ_9uh7ADhTXQ'
);

const createAdminUser = async () => {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';
  const adminName = 'مدير النظام';

  try {
    console.log('Creating admin user...');

    // Create user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
    });

    if (authError) {
      console.error('Error creating user account:', authError);
      return;
    }

    if (authData.user) {
      console.log('User account created successfully:', authData.user.id);

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: adminName,
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      } else {
        console.log('Profile created successfully');
      }

      // Update user role to admin
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: authData.user.id,
          role: 'admin'
        });

      if (roleError) {
        console.error('Error setting admin role:', roleError);
      } else {
        console.log('Admin role assigned successfully');
      }

      console.log('\n✅ Admin user created successfully!');
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
      console.log(`Name: ${adminName}`);
      console.log('\nYou can now log in with these credentials.');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
};

// Run the admin user creation
createAdminUser().catch(console.error);

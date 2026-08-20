import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yjcixgzqjcoinlfsqsoa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqY2l4Z3pxamNvaW5sZnNxc29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5Njg5NDEsImV4cCI6MjEwMjU0NDk0MX0.rGt-VXGxHQI_t2wb3Mzo37qq5w-PgQrgZWvBxrnZwME';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    console.log('Logging in as admin...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'padmini@anurag.edu.in',
      password: 'admin12345'
    });

    if (authError) {
      console.error('Login failed:', authError.message);
      return;
    }

    console.log('Login successful. User ID:', authData.user.id);
    console.log('Token length:', authData.session.access_token.length);

    // Simulate uploading a file (mock text blob)
    const blob = new Blob(['Test announcement attachment content'], { type: 'text/plain' });
    const file = new File([blob], 'test-notice.txt', { type: 'text/plain' });
    
    const fileName = `test-${Date.now()}.txt`;
    console.log(`Attempting to upload file: ${fileName} to announcements bucket...`);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('announcements')
      .upload(fileName, file, {
        contentType: 'text/plain',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload FAILED:', uploadError);
      return;
    }

    console.log('Storage upload SUCCESSFUL:', uploadData);

    // Try clean up
    console.log('Cleaning up uploaded test file...');
    const { error: removeError } = await supabase.storage
      .from('announcements')
      .remove([fileName]);

    if (removeError) {
      console.error('Cleanup failed:', removeError.message);
    } else {
      console.log('Cleanup successful.');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();

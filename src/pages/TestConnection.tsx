import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TestConnection = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testDatabaseConnection = async () => {
    setIsLoading(true);
    setTestResult('Testing...');

    try {
      // Test 1: Check if we can connect to Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        setTestResult(`❌ Session Error: ${sessionError.message}`);
        return;
      }

      // Test 2: Check if we can query the database
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('count')
        .limit(1);

      if (customersError) {
        setTestResult(`❌ Database Error: ${customersError.message}`);
        return;
      }

      // Test 3: Check if functions work
      const { data: stats, error: statsError } = await supabase
        .rpc('get_dashboard_stats');

      if (statsError) {
        setTestResult(`❌ Function Error: ${statsError.message}`);
        return;
      }

      setTestResult(`✅ All tests passed! Database is working correctly.`);
    } catch (error: any) {
      setTestResult(`❌ Unexpected Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Database Connection Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testDatabaseConnection} disabled={isLoading}>
            {isLoading ? 'Testing...' : 'Test Database Connection'}
          </Button>
          
          {testResult && (
            <div className="p-4 bg-gray-100 rounded-md">
              <pre className="whitespace-pre-wrap">{testResult}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TestConnection;

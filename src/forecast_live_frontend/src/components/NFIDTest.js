import React, { useState } from 'react';

function NFIDTest() {
  const [testResult, setTestResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testNFIDImport = async () => {
    setLoading(true);
    setTestResult('Testing NFID import...');
    
    try {
      // Test dynamic import
      console.log('Attempting to import NFID...');
      const nfidModule = await import('@nfid/embed');
      console.log('NFID module imported:', nfidModule);
      
      const { NFIDAuth, NFIDConfig, NFIDNetworkOption } = nfidModule;
      
      if (!NFIDAuth || !NFIDConfig || !NFIDNetworkOption) {
        throw new Error('NFID module components not found');
      }
      
      setTestResult('✅ NFID module imported successfully!\n' + 
                   `- NFIDAuth: ${typeof NFIDAuth}\n` +
                   `- NFIDConfig: ${typeof NFIDConfig}\n` +
                   `- NFIDNetworkOption: ${typeof NFIDNetworkOption}`);
      
      // Test config creation
      try {
        const config = new NFIDConfig({
          application: {
            name: 'Test App',
            logo: window.location.origin + '/logo192.png',
          },
          networkOption: NFIDNetworkOption.TESTNET,
          redirectURL: window.location.origin,
          derivationOrigin: 'https://identity.ic0.app',
        });
        
        setTestResult(prev => prev + '\n✅ NFIDConfig created successfully!');
        
        // Test init (this might fail but let's see)
        try {
          await NFIDAuth.init(config);
          setTestResult(prev => prev + '\n✅ NFID initialized successfully!');
        } catch (initError) {
          setTestResult(prev => prev + '\n❌ NFID init failed: ' + initError.message);
        }
        
      } catch (configError) {
        setTestResult(prev => prev + '\n❌ Config creation failed: ' + configError.message);
      }
      
    } catch (error) {
      console.error('NFID test error:', error);
      setTestResult('❌ NFID import failed: ' + error.message + '\n' +
                   'Stack: ' + error.stack);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">NFID Debug Test</h2>
      
      <button
        onClick={testNFIDImport}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
      >
        {loading ? 'Testing...' : 'Test NFID Import'}
      </button>
      
      {testResult && (
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
          {testResult}
        </pre>
      )}
    </div>
  );
}

export default NFIDTest;

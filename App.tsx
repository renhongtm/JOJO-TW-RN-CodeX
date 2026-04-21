import React, { useMemo } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { sampleFollowReadPayload } from './src/followread/data/samplePayload';
import { normalizeFollowReadConfig } from './src/followread/normalize';
import { TemplateHost } from './src/followread/template/TemplateHost';

function App(): React.JSX.Element {
  const config = useMemo(
    () => normalizeFollowReadConfig(sampleFollowReadPayload),
    [],
  );

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <TemplateHost config={config} />
    </SafeAreaProvider>
  );
}

export default App;

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, Button } from 'react-native';
import { useShareIntent } from 'expo-share-intent';

export default function App() {
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntent();
  const [extractedUrl, setExtractedUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const extractUrlFromText = (text: string): string | null => {
    try {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const matches = text.match(urlRegex);
      return matches && matches.length > 0 ? matches[0] : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (hasShareIntent && shareIntent) {
      const url = shareIntent.webUrl || extractUrlFromText(shareIntent.text || '');
      setExtractedUrl(url);
      const logEntry = `Received: ${new Date().toISOString()}\nURL: ${url}\nText: ${shareIntent.text}\nWebUrl: ${shareIntent.webUrl}`;
      setLogs(prev => [logEntry, ...prev]);
    }
    if (error) {
      const logEntry = `Error: ${error}`;
      setLogs(prev => [logEntry, ...prev]);
    }
  }, [hasShareIntent, shareIntent, error]);

  const handleReset = () => {
    resetShareIntent();
    setExtractedUrl(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Catchup Share POC</Text>
      <Text style={styles.subtitle}>Phase 1 - Share Integration Spike</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.label}>Share Received:</Text>
        <Text style={[styles.value, hasShareIntent ? styles.success : styles.pending]}>
          {hasShareIntent ? 'YES' : 'NO'}
        </Text>
      </View>

      {extractedUrl && (
        <View style={styles.urlContainer}>
          <Text style={styles.label}>Extracted URL:</Text>
          <Text style={styles.url} selectable>{extractedUrl}</Text>
        </View>
      )}

      {shareIntent && (
        <View style={styles.payloadContainer}>
          <Text style={styles.label}>Full Payload:</Text>
          <ScrollView style={styles.scrollView}>
            <Text style={styles.payload}>{JSON.stringify(shareIntent, null, 2)}</Text>
          </ScrollView>
        </View>
      )}

      {logs.length > 0 && (
        <View style={styles.logsContainer}>
          <Text style={styles.label}>Logs:</Text>
          <ScrollView style={styles.scrollViewSmall}>
            {logs.map((log, i) => (
              <Text key={i} style={styles.log}>{log}</Text>
            ))}
          </ScrollView>
        </View>
      )}

      <Button title="Reset Share Intent" onPress={handleReset} />

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  value: {
    fontSize: 18,
    marginLeft: 10,
  },
  success: {
    color: '#22c55e',
    fontWeight: 'bold',
  },
  pending: {
    color: '#999',
  },
  urlContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
  },
  url: {
    fontSize: 14,
    color: '#1e40af',
    flexWrap: 'wrap',
  },
  payloadContainer: {
    marginBottom: 20,
    flex: 1,
    maxHeight: 200,
  },
  scrollView: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 10,
  },
  payload: {
    fontSize: 10,
    color: '#10b981',
    fontFamily: 'monospace',
  },
  logsContainer: {
    marginBottom: 20,
    flex: 1,
    maxHeight: 150,
  },
  scrollViewSmall: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
  },
  log: {
    fontSize: 10,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
});

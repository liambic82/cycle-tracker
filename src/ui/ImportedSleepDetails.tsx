import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { describeImportedSleep, sleepImportKey, type ImportedSleep } from '../domain/sleepImport';
import { Button } from './components';
import { useTheme } from './theme';

export function ImportedSleepDetails({
  records,
  change,
}: {
  records: ImportedSleep[];
  change: (records: ImportedSleep[]) => void;
}) {
  const { common } = useTheme();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [removed, setRemoved] = useState<ImportedSleep | null>(null);
  if (!records.length && !removed) return null;
  return (
    <View style={{ gap: 12 }}>
      <Text style={common.label}>
        {records.length} imported sleep session(s) · separate from manual details
      </Text>
      <Button
        secondary
        label={open ? 'Hide imported sleep' : 'Review imported sleep'}
        onPress={() => setOpen(!open)}
      />
      {open && (
        <>
          <Text style={common.small}>
            Copies from Health Connect. Source estimates may differ from your experience. Sessions,
            naps and overlaps are kept separately, not added together. Removing a copy here does not
            change Fitbit or Health Connect.
          </Text>
          {records.map((record) => (
            <View key={sleepImportKey(record)} style={{ gap: 10 }}>
              {describeImportedSleep(record)
                .slice(0, -1)
                .map((line, i) => (
                  <Text key={i} style={common.small}>
                    {line}
                  </Text>
                ))}
              {confirm === sleepImportKey(record) ? (
                <>
                  <Text style={common.body}>
                    Remove this imported copy? Manual sleep and other records stay intact. You can
                    undo here until you leave this entry.
                  </Text>
                  <Button secondary label="Keep imported copy" onPress={() => setConfirm(null)} />
                  <Button
                    danger
                    label="Remove imported copy"
                    onPress={() => {
                      change(records.filter((x) => sleepImportKey(x) !== sleepImportKey(record)));
                      setRemoved(record);
                      setConfirm(null);
                    }}
                  />
                </>
              ) : (
                <Button
                  secondary
                  label={`Remove session ending ${record.end}`}
                  onPress={() => setConfirm(sleepImportKey(record))}
                />
              )}
            </View>
          ))}
        </>
      )}
      {removed && (
        <Button
          secondary
          label="Undo imported sleep removal"
          onPress={() => {
            if (!records.some((x) => sleepImportKey(x) === sleepImportKey(removed)))
              change([...records, removed]);
            setRemoved(null);
          }}
        />
      )}
    </View>
  );
}
